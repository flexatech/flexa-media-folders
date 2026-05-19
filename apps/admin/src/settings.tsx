import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers";
import { SettingsPage } from "./features/settings/SettingsPage";
import "./styles/index.css";

const root = document.getElementById("flexa-mf-admin-root");
if (root) {
    createRoot(root).render(
        <StrictMode>
            <AppProviders>
                <SettingsPage />
            </AppProviders>
        </StrictMode>,
    );
}
