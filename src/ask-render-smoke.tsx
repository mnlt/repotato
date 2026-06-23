import React from "react";
import { render } from "ink-testing-library";
import { AskScreen } from "./components/AskScreen.js";

const { lastFrame } = render(
  <AskScreen
    width={60}
    productName="Bubble Tea"
    messages={[
      { role: "user", text: "install it" },
      { role: "assistant", text: "Installing Bubble Tea via `go install`…" },
    ]}
    streaming={true}
    streamingText="Running the install now"
    toolNote="running Bash…"
    input=""
  />,
);
console.log(lastFrame());
