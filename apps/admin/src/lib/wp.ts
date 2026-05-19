/**
 * Bridge to the `flexaMF` global published by Enqueue.php via wp_localize_script.
 */

export type FlexaMfContext = "settings" | "media-library";
export type FlexaMfTheme = "light" | "dark";

export interface FlexaMfGlobal {
    restUrl: string;
    restNonce: string;
    context: FlexaMfContext;
    version: string;
    pluginUrl: string;
    locale: string;
    theme: FlexaMfTheme;
    settingsUrl: string;
}

declare global {
    interface Window {
        flexaMF?: FlexaMfGlobal;
    }
}

export function getFlexaMF(): FlexaMfGlobal {
    if (!window.flexaMF) {
        throw new Error(
            "flexaMF global missing - make sure Enqueue::enqueue_admin ran before this script.",
        );
    }
    return window.flexaMF;
}
