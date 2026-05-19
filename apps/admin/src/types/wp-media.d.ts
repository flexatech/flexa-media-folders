/**
 * Minimal ambient types for the parts of `wp.media` we touch.
 *
 * Backbone is the underlying library; rather than pull in @types/backbone we
 * declare just the shape we need. Anything missing falls back to `any` -
 * intentional because `wp.media` exposes a huge surface and we only consume
 * slices of it.
 */

declare global {
    interface WpMediaQueryArgs {
        post_mime_type?: string;
        s?: string;
        orderby?: string;
        order?: "ASC" | "DESC";
        flexa_mf_folder?: number;
        [key: string]: unknown;
    }

    interface WpMediaModel {
        get(key: string): unknown;
        set(key: string, value: unknown): WpMediaModel;
        attributes: Record<string, unknown>;
    }

    interface WpMediaCollection {
        each(iter: (model: WpMediaModel) => void): void;
        props: WpMediaModel;
        _hasMore?: boolean;
        mirroring?: WpMediaCollection;
        more?: () => unknown;
        reset(): WpMediaCollection;
    }

    interface WpMediaView {
        cid: string;
        el: HTMLElement;
        $el: { append(content: HTMLElement | string): unknown; before(content: HTMLElement | string): unknown };
        controller: {
            state(): WpMediaModel;
            on(event: string, cb: (...args: unknown[]) => void): unknown;
            off(event: string, cb?: (...args: unknown[]) => void): unknown;
        };
        on(event: string, cb: (...args: unknown[]) => void): unknown;
        off(event: string, cb?: (...args: unknown[]) => void): unknown;
        trigger(event: string, ...args: unknown[]): unknown;
        render(): WpMediaView;
        remove(): WpMediaView;
        model?: WpMediaModel;
    }

    interface WpMediaViewConstructor {
        prototype: WpMediaView & Record<string, unknown>;
        extend(props: Record<string, unknown>): WpMediaViewConstructor;
    }

    interface WpMediaModelQuery {
        prototype: {
            _requestArgs(options?: Record<string, unknown>): WpMediaQueryArgs;
        };
        get(props: Record<string, unknown>, options?: unknown): WpMediaCollection;
    }

    interface WpMedia {
        model: {
            Query: WpMediaModelQuery;
            Attachments: unknown;
        };
        view: {
            AttachmentsBrowser: WpMediaViewConstructor;
            Attachments: WpMediaViewConstructor;
            Attachment: {
                Library: WpMediaViewConstructor;
                Details: WpMediaViewConstructor;
            };
            MediaFrame: WpMediaViewConstructor;
        };
        frame?: WpMediaView | null;
        query?: (props?: Record<string, unknown>) => WpMediaCollection;
    }

    interface WpBackboneCollection {
        on(event: string, cb: (model: WpMediaModel, ...args: unknown[]) => void): void;
        off(event: string, cb?: (model: WpMediaModel, ...args: unknown[]) => void): void;
    }

    interface WpUploader {
        queue?: WpBackboneCollection;
    }

    interface WpGlobal {
        media?: WpMedia;
        Uploader?: WpUploader;
    }
    interface Window {
        wp?: WpGlobal;
    }
}

export {};
