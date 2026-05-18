When people say **"origin"**, they mean this exact combination:

```
http://localhost:5173

protocol   host      port
  http    localhost  5173
```

**That's it. Origin = protocol + host + port. Nothing else.**

---

**Each part:**

**Protocol** — `http` or `https`
Even if everything else matches, `http://localhost` and `https://localhost` are **different origins.** Browser treats them as strangers.

---

**Host** — the domain or IP
`localhost` vs `127.0.0.1` — technically different hosts, so different origins. Same goes for `example.com` vs `api.example.com` — subdomains count as different origins too.

---

**Port** — the number after `:`
`localhost:3000` vs `localhost:5173` — different origins. This is exactly why your React frontend and Express backend are **cross-origin** even though they're on the same machine. Different ports = different origins, full stop.

---

## The "same origin" rule in one line

Browser only freely allows requests when **all three match exactly.** Even one mismatch → CORS kicks in → server must explicitly permit it.

```
http://localhost:5173  →  http://localhost:5173  ✅ same origin
http://localhost:5173  →  http://localhost:3000  ❌ different port
http://localhost:5173  →  https://localhost:5173 ❌ different protocol
http://localhost:5173  →  http://api.localhost:5173 ❌ different host
```

---

```
https://api.spotify.com:443/v1/songs?genre=pop&limit=10#results

protocol      host       port  path        query          fragment
 https    api.spotify.com 443  /v1/songs  genre=pop&limit=10  results
```

---

## Every part quickly:

- **Protocol** → `https` — how data travels
- **Host** → `api.spotify.com` — which server
- **Port** → `443` — which door on that server (443 is default for https, 80 for http — usually hidden in URLs)
- **Path** → `/v1/songs` — which resource on that server
- **Query** → `?genre=pop&limit=10` — filters/parameters
- **Fragment** → `#results` — jumps to a section on the page, **never sent to server**, purely browser-side

---

## URL vs URI

People use these interchangeably but there's a clean distinction:

**URI** (Uniform Resource *Identifier*) — just *identifies* something. Like a name.

**URL** (Uniform Resource *Locator*) — identifies *and* tells you *where to find it / how to reach it.* Like a name + address.

```
/v1/songs/123        → URI  (identifies a resource, but no protocol/host)
https://api.spotify.com/v1/songs/123  → URL  (full address, you can actually reach it)
```

One liner —
> **Every URL is a URI, but not every URI is a URL.** 😄