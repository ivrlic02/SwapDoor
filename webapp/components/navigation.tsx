"use client";

import Link from "next/link";

type Page = {
  title: string;
  path: `/${string}`;
};

/**
 * pages is an array of objects representing the pages in the web app.
 * Each object contains a title and a path. This array is used to generate the navigation menu.
 *
 * We hardcode pages here, but in real app you want to store and read this information from some external source (e.g. CMS, DB, config file, etc).
 */
const pages: Page[] = [
  {
    title: "Explore",
    path: "/explore",
  },
  {
    title: "Swaps",
    path: "/swaps",
  },
  {
    title: "Messages",
    path: "/messages",
  },
  {
    title: "Service",
    path: "/service",
  },
  {
    title: "User Menu",
    path: "/user-menu",
  },
  
];

/**
 * Render a page list item.
 * @param page - { title, path } for the page
 * @param index - array index used for key
 * @returns JSX element for a list item
 */
function processPage(page: Page, index: number) {
  return (
    <li key={index}>
      <Link href={page.path}>{page.title}</Link>
    </li>
  );
}

export function Navigation() {
  return (
    <nav>
      <ul className="flex space-x-4 mb-4">{pages.map(processPage)}</ul>
    </nav>
  );
}