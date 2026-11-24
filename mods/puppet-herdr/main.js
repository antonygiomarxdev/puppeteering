// Puppets: each Claude Code agent herdr sees, with its tasks and alerts from puppet-monitor's state file. Read only.

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, panes, run, theme, home, readTextFile, checking } from "herdr";
import { lineOf, matchAgents, stateFile } from "./match.js";

const TICK_MS = 2000;

// A missing file or bad JSON is no state: the agent shows "no session".
async function load(path) {
  try {
    const text = await readTextFile(path);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export default class Puppets extends View {
  init(_props, cx) {
    this.matches = [];
    if (checking()) return;
    cx.timer.every(TICK_MS, async (cx) => {
      const all = panes();
      const states = {};
      for (const agent of agents()) {
        const pane = agent.app === "claude-code" && all.find((known) => known.pane === agent.pane);
        if (pane?.cwd) {
          const path = stateFile(home(), pane.cwd);
          states[path] = await load(path);
        }
      }
      this.matches = matchAgents(agents(), all, states, Date.now());
      cx.notify();
    });
  }

  row(t, match) {
    const line = lineOf(match);
    const color = t[line.status] ?? t.dim;
    const text = (words, c) => div().text_size(12).text_color(c).child(words);
    return v_flex()
      .id(`puppet-${match.agent.address}`)
      .p(8)
      .gap(2)
      .rounded(8)
      .hover((el) => el.bg(t.hover))
      .on_click(() => run("agent.focus", { terminal: match.agent.address }))
      .child(h_flex().gap(8).child(div().flex_1().truncate().text_color(t.foreground).child(line.name)).child(text(`${line.status} ${line.count}`.trim(), color)))
      .children(line.open.map((task) => text(task, t.muted)))
      .children(line.alerts.map((alert) => text(alert, t.blocked)))
      .when(Boolean(line.note), (el) => el.child(text(line.note, t.dim)));
  }

  render() {
    const t = theme();
    return v_flex().size_full().p(8).gap(4).text_size(12.8).children(this.matches.map((match) => this.row(t, match)));
  }
}
