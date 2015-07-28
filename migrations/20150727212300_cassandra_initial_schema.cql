
CREATE TABLE jmaxml_feeds (
  id uuid PRIMARY KEY,
  updated timestamp,
  title text,
  author text,
  doc text
);

CREATE INDEX ON jmaxml_feeds (updated);
CREATE INDEX ON jmaxml_feeds (title);

