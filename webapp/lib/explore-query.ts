// Where Explore parks its current filter query string, so a listing page can
// send the user back to the exact results they came from. sessionStorage (not
// localStorage) on purpose: a search belongs to this browsing session, and a
// week-old filter set resurfacing would be a surprise, not a convenience.
export const EXPLORE_QUERY_KEY = "swapdoor:explore-query";
