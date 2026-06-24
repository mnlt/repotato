// The badge is now unified: there's a single smart badge that already shows the
// repo name + count and auto-upgrades to the Repo-of-the-Day medal. This /day
// path is kept as an alias so any badge URL already embedded keeps working.
export { GET, revalidate } from "../route";
