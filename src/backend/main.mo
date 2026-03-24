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

  var events : [Event] = [];
  var tasks : [Task] = [];
  var nextEventId : Nat = 1;
  var nextTaskId : Nat = 1;
  var seeded : Bool = false;

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

  // ── Seed ───────────────────────────────────────────────────────────────────

  public shared ({ caller }) func seedData() : async () {
    if (seeded) return;
    seeded := true;
    let now : Int = Time.now() / 1_000_000;
    let day : Int = 86_400_000;

    events := [
      { id = 0; title = "Team Standup"; description = "Daily sync meeting"; startTime = now + day; endTime = now + day + 1_800_000; category = "Meeting"; priority = "medium"; owner = caller },
      { id = 1; title = "Product Review"; description = "Quarterly product review"; startTime = now + day + 3_600_000; endTime = now + day + 7_200_000; category = "Meeting"; priority = "high"; owner = caller },
      { id = 2; title = "Gym Session"; description = "Workout"; startTime = now + 2 * day; endTime = now + 2 * day + 3_600_000; category = "Health"; priority = "low"; owner = caller },
      { id = 3; title = "Client Call"; description = "Demo for client"; startTime = now + 2 * day + 3_000_000; endTime = now + 2 * day + 5_400_000; category = "Meeting"; priority = "high"; owner = caller },
      { id = 4; title = "Design Workshop"; description = "UI/UX ideation"; startTime = now + 3 * day; endTime = now + 3 * day + 7_200_000; category = "Work"; priority = "medium"; owner = caller }
    ];
    nextEventId := 5;

    tasks := [
      { id = 0; title = "Write project proposal"; description = "Draft the Q2 proposal"; dueDate = now + day; estimatedHours = 3.0; priority = "high"; status = "in-progress"; owner = caller },
      { id = 1; title = "Review PRs"; description = "Code review backlog"; dueDate = now + day; estimatedHours = 1.5; priority = "medium"; status = "pending"; owner = caller },
      { id = 2; title = "Update docs"; description = "API documentation"; dueDate = now + 2 * day; estimatedHours = 2.0; priority = "low"; status = "pending"; owner = caller },
      { id = 3; title = "Fix login bug"; description = "Critical auth issue"; dueDate = now + 2 * day; estimatedHours = 4.0; priority = "high"; status = "pending"; owner = caller },
      { id = 4; title = "Prepare slides"; description = "Presentation for workshop"; dueDate = now + 3 * day; estimatedHours = 2.5; priority = "medium"; status = "pending"; owner = caller },
      { id = 5; title = "Send weekly report"; description = "Team status update"; dueDate = now + 4 * day; estimatedHours = 1.0; priority = "low"; status = "pending"; owner = caller }
    ];
    nextTaskId := 6;
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
};
