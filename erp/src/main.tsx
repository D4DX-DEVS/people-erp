import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./themes/blue-theme.css";
import "./themes/purple-theme.css";
import "./themes/green-theme.css";

// The tab icon is no longer pinned here. It used to be a build-time map of
// franchise slug → bundled logo, which meant one build could only ever brand
// one franchise. ConfigProvider now points the favicon at whatever the API
// reports for the franchise serving this request (see applyFavicon in
// ConfigContext); the static /favicon.ico in index.html covers the moment
// before that config arrives.

createRoot(document.getElementById("root")!).render(<App />);
