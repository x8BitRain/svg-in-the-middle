# svg-in-the-middle

A silly PoC server that tries to beat PortalRunner's [HTTP compression proxy Arachnidium](https://github.com/p2r3/Arachnidium) ([video](https://www.youtube.com/watch?v=S0G93hER8rI&t=4s)) by:

1. Rendering the requested page in a headless browser.
2. Taking a screenshot of the page and compressing it heavily with AVIF.
3. Noting down all the locations of `<a hrefs/>`, clickable buttons, clientRect and XY coords on  the page.
4. Creating an SVG with the AVIF image is the background and re-applying all the found clickable elements as invisible `<a hrefs/>` in the locations they were recorded at.

Each image send from the server is roughly 20-50kb depending on the content of the page. So scrolling to the bottom of NYTimes.com you'd only download ~600kb of images vs 14MB++ that it normally loads.

**That's ~95% less bandwidth!!!!**

## MAJOR limitations

This is very janky and doesn't work nearly as well as Arachnidium because you can't do anything that involves interactivity like JS, inputs, video, audio. Only basic links and page navigation work.

So this is only good for pages designed for reading and viewing images. 

Pages that are simple, mainly text based like hackernews can end up resulting in larger downloads than the origina page due to the generated image being larger than the page's text source, see below: 


## Rough Benchmark

Homepage only, no scrolls.

| Site                  | Direct | Arachnidium  | svg-in-the-middle   |
|-----------------------| --- |--------------|---------------------|
| NYTimes               | 14,835 KB / 13.9s | 8,143 KB     | 80 KB / 6.4s        |
| Wikipedia SVG article | 268 KB / 0.4s | 139 KB / 1.3s | 124 KB / 1.4s |
| Hacker News           | 12 KB / 0.8s | 8 KB / 0.9s | 110 KB / 1.8s (lmao) |

You could really push this if you set AVIF_QUALITY to 0.01 or something but text and images look nasty.

## Scrolling

2x the height of the requested page is rendered in AVIF & SVG so you can scroll a bit before an IntersectionObserver sees that a loader div at the end of the page has been reached, then it will ask the server to render the next part of the page at the last scrollHeight.

## Usage

Only tested on macOS, I think Bun uses software rendering for AVIFs on linux and windows so your performance may be worse on those platforms.

```bash
bun install
bun start
```

Open `http://localhost:3001`, for direct URL access `http://localhost:3001/nytimes.com`.
