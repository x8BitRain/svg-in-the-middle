const DEFAULT_PROTOCOL = "https://";
const EXPLICIT_PROTOCOL = /^https?:\/\//;

export const toTargetUrl = (proxyPath: string): URL | null => {
  const address = proxyPath.replace(/^\//, "");
  const withProtocol = EXPLICIT_PROTOCOL.test(address) ? address : DEFAULT_PROTOCOL + address;
  const url = URL.parse(withProtocol);
  return url?.hostname.includes(".") ? url : null;
};

export const toProxyPath = (targetUrl: string): string => {
  const address = targetUrl.startsWith(DEFAULT_PROTOCOL) ? targetUrl.slice(DEFAULT_PROTOCOL.length) : targetUrl;
  return `/${address}`;
};
