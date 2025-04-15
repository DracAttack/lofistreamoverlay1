import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for cyberpunk/lo-fi theme
const style = document.createElement("style");
style.textContent = `
  :root {
    --background: 240 10% 7%;
    --foreground: 0 0% 88%;
    --card: 240 10% 4%;
    --card-foreground: 0 0% 88%;
    --popover: 240 10% 4%;
    --popover-foreground: 0 0% 88%;
    --primary: 142 71% 42%;
    --primary-foreground: 0 0% 0%;
    --secondary: 271 81% 53%;
    --secondary-foreground: 0 0% 100%;
    --muted: 240 10% 15%;
    --muted-foreground: 0 0% 65%;
    --accent: 180 100% 50%;
    --accent-foreground: 0 0% 0%;
    --destructive: 0 100% 50%;
    --destructive-foreground: 0 0% 100%;
    --border: 271 81% 25%;
    --input: 240 10% 15%;
    --ring: 271 81% 53%;
    --radius: 0.5rem;
  }

  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 400;
    src: url('https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJuktqUYLk.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 600;
    src: url('https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJuktqUYLk.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 700;
    src: url('https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJuktqUYLk.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Rubik';
    font-style: normal;
    font-weight: 400;
    src: url('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UA.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Rubik';
    font-style: normal;
    font-weight: 500;
    src: url('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-NYi1UA.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Roboto Mono';
    font-style: normal;
    font-weight: 400;
    src: url('https://fonts.gstatic.com/s/robotomono/v24/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vqPQw.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Roboto Mono';
    font-style: normal;
    font-weight: 500;
    src: url('https://fonts.gstatic.com/s/robotomono/v24/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vqPQw.woff2') format('woff2');
  }

  body {
    font-family: 'Rubik', sans-serif;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Outfit', sans-serif;
  }

  code, pre, .font-mono {
    font-family: 'Roboto Mono', monospace;
  }

  .neon-primary {
    text-shadow: 0 0 5px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 50%);
  }

  .neon-secondary {
    text-shadow: 0 0 5px hsl(var(--secondary)), 0 0 20px hsl(var(--secondary) / 50%);
  }

  .neon-accent {
    text-shadow: 0 0 5px hsl(var(--accent)), 0 0 20px hsl(var(--accent) / 50%);
  }

  .neon-border-primary {
    box-shadow: 0 0 5px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 50%);
  }

  .neon-border-secondary {
    box-shadow: 0 0 5px hsl(var(--secondary)), 0 0 20px hsl(var(--secondary) / 50%);
  }

  .neon-border-accent {
    box-shadow: 0 0 5px hsl(var(--accent)), 0 0 20px hsl(var(--accent) / 50%);
  }

  .backdrop-blur {
    backdrop-filter: blur(8px);
  }

  .quote-overlay {
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
  }

  .preview-area {
    background-image: linear-gradient(45deg, #0A0A0A 25%, transparent 25%), 
                      linear-gradient(-45deg, #0A0A0A 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #0A0A0A 75%), 
                      linear-gradient(-45deg, transparent 75%, #0A0A0A 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }
`;

document.head.appendChild(style);

// Add Remixicon CSS
const remixiconLink = document.createElement("link");
remixiconLink.href = "https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css";
remixiconLink.rel = "stylesheet";
document.head.appendChild(remixiconLink);

// Set title
document.title = "Lo-Fi Stream Overlay";

createRoot(document.getElementById("root")!).render(<App />);
