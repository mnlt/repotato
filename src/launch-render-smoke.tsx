import React from "react";
import { render } from "ink-testing-library";
import { LaunchScreen } from "./components/LaunchScreen.js";

const { lastFrame } = render(
  <LaunchScreen
    width={60}
    step="preview"
    url="https://github.com/charmbracelet/glow"
    draft={{
      full_name: "charmbracelet/glow",
      name: "glow",
      description: "Render markdown on the CLI, with pizzazz!",
      owner_login: "charmbracelet",
      owner_avatar: "",
      stars: 18000,
      topics: ["markdown", "cli", "tui"],
      private: false,
    }}
    tagline="Render markdown on the CLI, with pizzazz!"
    editable={true}
    message=""
    posterLogin="mnlt"
  />,
);
console.log(lastFrame());
