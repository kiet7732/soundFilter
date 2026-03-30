import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { UploadDashboard } from "./screens/UploadDashboard";
import { ProcessingScreen } from "./screens/ProcessingScreen";
import { MusicWorkspace } from "./screens/MusicWorkspace";
import { EnvironmentWorkspace } from "./screens/EnvironmentWorkspace";
import { SettingsScreen } from "./screens/SettingsScreen";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: UploadDashboard },
      { path: "settings", Component: SettingsScreen },
      { path: "music-workspace", Component: MusicWorkspace },
      { path: "environment-workspace", Component: EnvironmentWorkspace },
    ],
  },
  // Processing screen is OUTSIDE RootLayout for full-screen experience
  { path: "processing", Component: ProcessingScreen },
  // Catch-all fallback
  { path: "*", Component: NotFound },
]);