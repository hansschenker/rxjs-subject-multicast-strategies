---
exported: 2026-08-29T10:05:43.139Z
source: NotebookLM
type: chat
title: "Thoughts expand_moreIn the Subject Router Algebra,..."
---

# Thoughts expand_moreIn the Subject Router Algebra,...

导出时间: 8/29/2026, 12:05:43 PM

---

Thoughts

In the Subject Router Algebra, the **Terminal-Signal Policy** dictates **how the central hub (the Subject) handles and routes terminal signals**—specifically, **completion** and **error** notifications\[1\]\[2\].

Under this policy, the router's behavior is defined by two key aspects:

1.  **Routing Terminal Signals**: The Subject does not only distribute data values; it is also responsible for forwarding upstream completion and error notifications to all registered routes in its routing table\[2\].
2.  **Entering the Terminal State**: Once a terminal signal (error or completion) is received, the hub transitions into a permanent **terminal state**\[1\]\[2\].

### How It Intersects with Other Axes

The Terminal-Signal Policy does not exist in isolation. Its configuration has a direct, cascading effect on other dimensions of the multicast space:

-   **Intersection with Late-Subscriber Policy**: Together with the **Memory Policy**, the terminal-signal policy determines exactly **what a late arrival receives about the past** once the hub has terminated\[1\]\[3\]. For example, a terminated `AsyncSubject` will deliver only its final value and completion signal to late subscribers\[4\].
-   **Intersection with Reset Policy**: When the upstream source complete or error signal transitions the hub to a terminal state, the **Reset Policy** is evaluated\[5\]\[6\]. Depending on your `share()` configurations (such as `resetOnComplete` or `resetOnError`), this terminal event will decide whether to discard and evict the dead router from memory or retain it\[5\]\[6\].

🧩 Would you like to explore how different Subject types (like `AsyncSubject` or `ReplaySubject`) handle late arrivals once they enter this terminal state?
---

## 引用来源

[1] All notes 8/28/2026
[2] Yes — for **classical [RxJS](https://app.recall.i…
[3] Yes — for **classical [RxJS](https://app.recall.i…
[4] All notes 8/28/2026
[5] All notes 8/28/2026
[6] All notes 8/28/2026
