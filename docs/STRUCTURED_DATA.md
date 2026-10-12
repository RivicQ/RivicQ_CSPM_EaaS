# Structured Data (schema.org / JSON-LD)

RivicQ publishes JSON-LD in the `<head>` of the public static pages. Only
**factual, verifiable** values are emitted. Placeholder or invented data
(fake reviews, ratings, opening hours, coordinates) is deliberately **not**
shipped — search engines penalize fabricated structured data and it conflicts
with our no-false-claims policy (`docs/UI.md`, `SECURITY.md`).

## Live now

| Page | Types emitted |
|------|---------------|
| `marketing/index.html` | `Organization`, `WebSite`, `WebPage`, `Service`, `OfferCatalog` (+ `Offer`), `ItemList` |
| `marketing/showcase.html` | `WebPage`, `BreadcrumbList` |
| `docs/index.html` | `Organization`, `WebPage`, `BreadcrumbList` |

All pages reuse the same Organization `@id` (`https://rivicq.com/#organization`)
so the entity is deduplicated across the site.

Factual values in use:

- Organization name: **RivicQ GmbH**
- Address: Rudower Chaussee 29, 12489 Berlin, DE
- Email desks: `hello@`, `sales@`, `support@`, `security@` `@rivicq.com`
- Editions: Community (Apache-2.0, free) and Enterprise (commercial)

## Templates for types that need real data

Fill these with **verified** values before adding them to a page. Do not publish
with placeholder text.

### LocalBusiness + GeoCoordinates + OpeningHoursSpecification

Only appropriate if RivicQ operates a physical, visitable location with real
opening hours. Otherwise an `Organization` with a `PostalAddress` (already live)
is the correct model — a software vendor is not a local business.

```json
{
  "@type": "LocalBusiness",
  "@id": "https://rivicq.com/#localbusiness",
  "name": "RivicQ GmbH",
  "image": "https://rivicq.com/assets/rivicq-mark.png",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rudower Chaussee 29",
    "addressLocality": "Berlin",
    "postalCode": "12489",
    "addressCountry": "DE"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 0.0, "longitude": 0.0 },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "telephone": "+49-000-000000"
}
```

### Person (founder / team)

Only for public, consenting individuals. Do not publish private mailboxes
(`docs/CONTACT.md`).

```json
{
  "@type": "Person",
  "name": "Full Name",
  "jobTitle": "Role",
  "worksFor": { "@id": "https://rivicq.com/#organization" },
  "url": "https://rivicq.com/about"
}
```

### Review + AggregateRating

Requires **genuine, attributable** customer reviews collected by RivicQ. Never
self-issue or synthesize ratings.

```json
{
  "@type": "Product",
  "name": "RivicQ Enterprise",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "12"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Customer Name" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5" },
      "reviewBody": "Verbatim, consented quote."
    }
  ]
}
```

### FAQPage

Add only when the page actually shows the same Q&A as visible content.

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question text?",
      "acceptedAnswer": { "@type": "Answer", "text": "Answer text." }
    }
  ]
}
```

### BlogPosting

For a real blog index/post. Add `Article`/`BlogPosting` on each post with
`headline`, `datePublished`, `dateModified`, `author`, and `publisher`
(org `@id`). No blog exists yet; add this alongside the blog.

## Validation

- Validate with Google's Rich Results Test and the schema.org validator.
- Keep `@id` values stable and absolute.
- Prefer one `<script type="application/ld+json">` per page using an `@graph`.
