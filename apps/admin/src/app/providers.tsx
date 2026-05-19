import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";

/**
 * One QueryClient shared across every React root we mount (the standalone
 * settings page plus each media-library sidebar). Cross-root caching means
 * a mutation on the modal sidebar updates the upload.php tree immediately.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
        },
    },
});

export function AppProviders({ children }: PropsWithChildren) {
    const theme = window.flexaMF?.theme ?? "light";
    return (
        <QueryClientProvider client={queryClient}>
            <div data-theme={theme} className="flexa-mf-themed">
                {children}
            </div>
        </QueryClientProvider>
    );
}
