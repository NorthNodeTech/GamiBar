import {
  Link as ReactRouterLink,
  Outlet,
  useLocation,
  useNavigate as useReactRouterNavigate,
  useParams as useReactRouterParams,
  useSearchParams,
  type LinkProps as ReactRouterLinkProps,
} from "react-router-dom";
import type { ReactNode } from "react";

type SearchValue = string | number | boolean | null | undefined;
type Search = Record<string, SearchValue>;
type Params = Record<string, string | number>;

function interpolatePath(path: string, params?: Params): string {
  if (!params) return path;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`$${key}`, encodeURIComponent(String(value))),
    path,
  );
}

function withSearch(path: string, search?: Search): string {
  if (!search) return path;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value != null && value !== "") query.set(key, String(value));
  }
  const value = query.toString();
  return value ? `${path}?${value}` : path;
}

export type LinkProps = Omit<ReactRouterLinkProps, "to"> & {
  to: string;
  params?: Params;
  search?: Search;
  children?: ReactNode;
};

export function Link({ to, params, search, ...props }: LinkProps) {
  return <ReactRouterLink to={withSearch(interpolatePath(to, params), search)} {...props} />;
}

type NavigateOptions = {
  to: string;
  params?: Params;
  search?: Search;
  replace?: boolean;
};

export function useNavigate() {
  const navigate = useReactRouterNavigate();
  return (options: NavigateOptions | string) => {
    if (typeof options === "string") {
      navigate(options);
      return;
    }
    navigate(withSearch(interpolatePath(options.to, options.params), options.search), {
      replace: options.replace,
    });
  };
}

export function useRouterState<T>({
  select,
}: {
  select: (state: {
    location: {
      pathname: string;
      search: string;
      searchStr: string;
      hash: string;
    };
  }) => T;
}): T {
  const location = useLocation();
  return select({
    location: {
      pathname: location.pathname,
      search: location.search,
      searchStr: location.search,
      hash: location.hash,
    },
  });
}

export function useSearch<T extends Record<string, string | undefined> = Record<string, string>>(
  _options?: unknown,
) {
  const [params] = useSearchParams();
  return Object.fromEntries(params.entries()) as T;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useReactRouterParams() as T;
}

export { Outlet, useLocation };
