import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor {

  // ── Types ──────────────────────────────────────────────────────────────────

  public type Event = {
    id : Nat;
    title : Text;
    description : Text;
    startTime : Int;
    endTime : Int;
    category : Text;
    priority : Text;
    owner : Principal;
  };

  public type Task = {
    id : Nat;
    title : Text;
    description : Text;
    dueDate : Int;
    estimatedHours : Float;
    priority : Text;
    status : Text;
    owner : Principal;
  };

  public type ConflictPair = {
    eventId1 : Nat;
    eventId2 : Nat;
    title1 : Text;
    title2 : Text;
  };

  public type DayLoad = {
    date : Text;
    loadScore : Float;
    eventCount : Nat;
    taskCount : Nat;
  };

  // ── State ──────────────────────────────────────────────────────────────────

  stable var events : [Event] = [];
  stable var tasks : [Task] = [];
  stable var nextEventId : Nat = 1;
  stable var nextTaskId : Nat = 1;
  stable var seeded : Bool = false; // retained for upgrade compatibility
  stable var cleared : Bool = false;

  // ── Helpers ────────────────────────────────────────────────────────────────

  func pad2(n : Int) : Text {
    if (n < 10) "0" # Int.toText(n) else Int.toText(n)
  };

  func msToDay(ms : Int) : Text {
    let secs : Int = ms / 1000;
    let totalDays : Int = secs / 86400;
    var rem = totalDays;
    var year : Int = 1970;
    label yloop loop {
      let diy : Int = if (year % 400 == 0) 366 else if (year % 100 == 0) 365 else if (year % 4 == 0) 366 else 365;
      if (rem < diy) break yloop;
      rem -= diy;
      year += 1;
    };
    let leap : Bool = (year % 400 == 0) or ((year % 4 == 0) and (year % 100 != 0));
    let mdays : [Int] = [31, if leap 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var month : Int = 1;
    label mloop for (md in mdays.vals()) {
      if (rem < md) break mloop;
      rem -= md;
      month += 1;
    };
    let day = rem + 1;
    Int.toText(year) # "-" # pad2(month) # "-" # pad2(day)
  };

  // ── Event CRUD ─────────────────────────────────────────────────────────────

  public shared ({ caller }) func createEvent(title : Text, description : Text, startTime : Int, endTime : Int, category : Text, priority : Text) : async Event {
    let e : Event = { id = nextEventId; title; description; startTime; endTime; category; priority; owner = caller };
    let buf = Buffer.fromArray<Event>(events);
    buf.add(e);
    events := Buffer.toArray(buf);
    nextEventId += 1;
    e
  };

  public query ({ caller }) func getEvents() : async [Event] {
    Array.filter(events, func(e : Event) : Bool { e.owner == caller })
  };

  public shared ({ caller }) func updateEvent(id : Nat, title : Text, description : Text, startTime : Int, endTime : Int, category : Text, priority : Text) : async Bool {
    var found = false;
    events := Array.map(events, func(e : Event) : Event {
      if (e.id == id and e.owner == caller) {
        found := true;
        { id; title; description; startTime; endTime; category; priority; owner = caller }
      } else e
    });
    found
  };

  public shared ({ caller }) func deleteEvent(id : Nat) : async Bool {
    let before = events.size();
    events := Array.filter(events, func(e : Event) : Bool { not (e.id == id and e.owner == caller) });
    events.size() < before
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func createTask(title : Text, description : Text, dueDate : Int, estimatedHours : Float, priority : Text) : async Task {
    let t : Task = { id = nextTaskId; title; description; dueDate; estimatedHours; priority; status = "pending"; owner = caller };
    let buf = Buffer.fromArray<Task>(tasks);
    buf.add(t);
    tasks := Buffer.toArray(buf);
    nextTaskId += 1;
    t
  };

  public query ({ caller }) func getTasks() : async [Task] {
    Array.filter(tasks, func(t : Task) : Bool { t.owner == caller })
  };

  public shared ({ caller }) func updateTask(id : Nat, title : Text, description : Text, dueDate : Int, estimatedHours : Float, priority : Text, status : Text) : async Bool {
    var found = false;
    tasks := Array.map(tasks, func(t : Task) : Task {
      if (t.id == id and t.owner == caller) {
        found := true;
        { id; title; description; dueDate; estimatedHours; priority; status; owner = caller }
      } else t
    });
    found
  };

  public shared ({ caller }) func deleteTask(id : Nat) : async Bool {
    let before = tasks.size();
    tasks := Array.filter(tasks, func(t : Task) : Bool { not (t.id == id and t.owner == caller) });
    tasks.size() < before
  };

  // ── Conflict Detection ─────────────────────────────────────────────────────

  public query ({ caller }) func getConflicts() : async [ConflictPair] {
    let mine = Array.filter(events, func(e : Event) : Bool { e.owner == caller });
    let pairs = Buffer.Buffer<ConflictPair>(0);
    let n = mine.size();
    var i = 0;
    while (i < n) {
      var j = i + 1;
      while (j < n) {
        let a = mine[i];
        let b = mine[j];
        if (a.startTime < b.endTime and b.startTime < a.endTime) {
          pairs.add({ eventId1 = a.id; eventId2 = b.id; title1 = a.title; title2 = b.title });
        };
        j += 1;
      };
      i += 1;
    };
    Buffer.toArray(pairs)
  };

  // ── Workload by Day ────────────────────────────────────────────────────────

  public query ({ caller }) func getWorkloadByDay(startMs : Int, endMs : Int) : async [DayLoad] {
    let myEvents = Array.filter(events, func(e : Event) : Bool { e.owner == caller });
    let myTasks = Array.filter(tasks, func(t : Task) : Bool { t.owner == caller });
    let result = Buffer.Buffer<DayLoad>(0);
    let dayMs : Int = 86_400_000;
    var cur = startMs;
    while (cur < endMs) {
      let dayEnd = cur + dayMs;
      let dateStr = msToDay(cur);
      let dayEvents = Array.filter(myEvents, func(e : Event) : Bool {
        e.startTime < dayEnd and e.endTime > cur
      });
      let dayTasks = Array.filter(myTasks, func(t : Task) : Bool {
        t.dueDate >= cur and t.dueDate < dayEnd
      });
      var eventHours : Float = 0.0;
      for (e in dayEvents.vals()) {
        let overlapStart = if (e.startTime > cur) e.startTime else cur;
        let overlapEnd = if (e.endTime < dayEnd) e.endTime else dayEnd;
        let diffMs : Int = overlapEnd - overlapStart;
        let dur : Float = Float.fromInt(diffMs) / 3_600_000.0;
        eventHours += dur;
      };
      var taskHours : Float = 0.0;
      for (t in dayTasks.vals()) {
        taskHours += t.estimatedHours;
      };
      result.add({
        date = dateStr;
        loadScore = eventHours + taskHours;
        eventCount = dayEvents.size();
        taskCount = dayTasks.size();
      });
      cur := cur + dayMs;
    };
    Buffer.toArray(result)
  };

  system func postupgrade() {
    if (not cleared) {
      events := [];
      tasks := [];
      nextEventId := 1;
      nextTaskId := 1;
      cleared := true;
    };
  };
};
