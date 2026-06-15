import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import ExploreDirectory from "../../pages/explore";
import type { ExploreCopy, ExploreDirectoryProps, ExploreStoreData } from "../../pages/explore";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePage: () => ({
    props: {},
  }),
}));

vi.mock("../../layouts/marketing_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marketing-layout">{children}</div>
  ),
}));

vi.mock("../../pages/explore/page_head", () => ({
  default: () => <title>Explore</title>,
}));

vi.mock("../../components/explore_directory/featured_records_rail", () => ({
  default: ({ records, label }: { records: any[]; label: string }) => (
    <div data-testid="featured-records-rail">
      <h2>{label}</h2>
      <span>{records.length}</span>
    </div>
  ),
}));

function makeStore(overrides: Partial<ExploreStoreData> = {}): ExploreStoreData {
  return {
    id: 1,
    name: "Test Store",
    discogs_username: "teststore",
    total_listings: 150,
    avatar_url: null,
    location: null,
    genre_tags: [],
    description: null,
    ...overrides,
  };
}

const defaultCopy: ExploreCopy = {
  headline: "Explore Record Stores",
  subhead: "Discover independent record stores powered by MilkCrate.",
  featured_label: "Featured Stores",
  featured_records_label: "Featured Records",
  all_stores_label: "All Stores",
  empty_state: "No stores have joined yet. Check back soon!",
};

function makeProps(overrides: Partial<ExploreDirectoryProps> = {}): ExploreDirectoryProps {
  return {
    stores: [],
    featured_stores: [],
    featured_records: [],
    copy: defaultCopy,
    error: null,
    ...overrides,
  };
}

describe("ExploreDirectory page", () => {
  it("renders the header section", () => {
    render(<ExploreDirectory {...makeProps()} />);
    expect(screen.getByRole("heading", { name: /explore record stores/i })).toBeInTheDocument();
  });

  it("renders intro copy beneath the heading", () => {
    render(<ExploreDirectory {...makeProps()} />);
    expect(screen.getByText(/discover independent record stores/i)).toBeInTheDocument();
  });

  it("renders inside MarketingLayout", () => {
    render(<ExploreDirectory {...makeProps()} />);
    expect(screen.getByTestId("marketing-layout")).toBeInTheDocument();
  });

  it("renders featured section when featured stores are provided", () => {
    const featured = [makeStore({ id: 10, name: "Featured Store" })];
    render(<ExploreDirectory {...makeProps({ featured_stores: featured })} />);
    expect(screen.getByRole("heading", { name: /featured stores/i })).toBeInTheDocument();
    expect(screen.getByText("Featured Store")).toBeInTheDocument();
  });

  it("does not render featured section when featured stores is empty", () => {
    render(<ExploreDirectory {...makeProps({ featured_stores: [] })} />);
    expect(screen.queryByRole("heading", { name: /featured stores/i })).not.toBeInTheDocument();
  });

  it("renders store cards in the directory grid", () => {
    const stores = [
      makeStore({ id: 1, name: "Alpha Records", discogs_username: "alpha" }),
      makeStore({ id: 2, name: "Beta Music", discogs_username: "beta" }),
    ];
    render(<ExploreDirectory {...makeProps({ stores })} />);
    expect(screen.getByText("Alpha Records")).toBeInTheDocument();
    expect(screen.getByText("Beta Music")).toBeInTheDocument();
  });

  it("renders All Stores section header with count", () => {
    const stores = [makeStore({ id: 1 }), makeStore({ id: 2 })];
    render(<ExploreDirectory {...makeProps({ stores })} />);
    expect(screen.getByRole("heading", { name: /all stores/i })).toBeInTheDocument();
  });

  it("shows empty state when no stores", () => {
    render(<ExploreDirectory {...makeProps({ stores: [] })} />);
    expect(screen.getByText(/no stores have joined yet/i)).toBeInTheDocument();
  });

  it("shows error alert when error is provided", () => {
    render(<ExploreDirectory {...makeProps({ error: "Something went wrong" })} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders store cards with links to store pages", () => {
    const stores = [makeStore({ discogs_username: "myrecordshop" })];
    render(<ExploreDirectory {...makeProps({ stores })} />);
    const link = screen.getByRole("link", { name: /myrecordshop/i });
    expect(link).toHaveAttribute("href", "/myrecordshop");
  });
});

describe("StoreCard", () => {
  it("displays store name and username", () => {
    const store = makeStore({ name: "Groove Hub", discogs_username: "groovehub" });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.getByText("Groove Hub")).toBeInTheDocument();
    expect(screen.getByText("@groovehub")).toBeInTheDocument();
  });

  it("displays listing count", () => {
    const store = makeStore({ total_listings: 1234 });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.getByText("1,234 listings")).toBeInTheDocument();
  });

  it("displays singular listing for count of 1", () => {
    const store = makeStore({ total_listings: 1 });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.getByText("1 listing")).toBeInTheDocument();
  });

  it("displays 'Listings coming soon' when total_listings is null", () => {
    const store = makeStore({ total_listings: null });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.getByText("Listings coming soon")).toBeInTheDocument();
  });

  it("displays location when available", () => {
    const store = makeStore({ location: "Brooklyn, NY" });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.getByText("Brooklyn, NY")).toBeInTheDocument();
  });

  it("displays description when available", () => {
    const store = makeStore({ description: "Best vinyl in town" });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.getByText("Best vinyl in town")).toBeInTheDocument();
  });

  it("does not display location when null", () => {
    const store = makeStore({ location: null });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.queryByText(/brooklyn/i)).not.toBeInTheDocument();
  });

  it("does not display description when null", () => {
    const store = makeStore({ description: null });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.queryByText(/best vinyl/i)).not.toBeInTheDocument();
  });

  it("renders avatar image when avatar_url is provided", () => {
    const store = makeStore({ avatar_url: "https://example.com/avatar.jpg" });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    const img = screen.getByRole("img", { name: /test store/i });
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("does not render avatar image when avatar_url is null", () => {
    const store = makeStore({ avatar_url: null });
    render(<ExploreDirectory {...makeProps({ stores: [store] })} />);
    expect(screen.queryByRole("img", { name: /test store/i })).not.toBeInTheDocument();
  });
});

describe("FeaturedSection", () => {
  it("displays featured store names", () => {
    const featured = [
      makeStore({ id: 10, name: "Featured One", discogs_username: "feat1" }),
      makeStore({ id: 11, name: "Featured Two", discogs_username: "feat2" }),
    ];
    render(<ExploreDirectory {...makeProps({ featured_stores: featured })} />);
    expect(screen.getByText("Featured One")).toBeInTheDocument();
    expect(screen.getByText("Featured Two")).toBeInTheDocument();
  });

  it("renders featured store links to store pages", () => {
    const featured = [makeStore({ id: 10, discogs_username: "featshop" })];
    render(<ExploreDirectory {...makeProps({ featured_stores: featured })} />);
    const links = screen.getAllByRole("link");
    const featLink = links.find((l) => l.getAttribute("href") === "/featshop");
    expect(featLink).toBeDefined();
  });

  it("displays listing count for featured stores", () => {
    const featured = [makeStore({ id: 10, total_listings: 500 })];
    render(<ExploreDirectory {...makeProps({ featured_stores: featured })} />);
    expect(screen.getByText("500 listings")).toBeInTheDocument();
  });

  it("displays location in featured cards", () => {
    const featured = [makeStore({ id: 10, location: "Williamsburg, Brooklyn" })];
    render(<ExploreDirectory {...makeProps({ featured_stores: featured })} />);
    expect(screen.getByText("Williamsburg, Brooklyn")).toBeInTheDocument();
  });

  it("displays description in featured cards", () => {
    const featured = [makeStore({ id: 10, description: "Rare jazz vinyl" })];
    render(<ExploreDirectory {...makeProps({ featured_stores: featured })} />);
    expect(screen.getByText("Rare jazz vinyl")).toBeInTheDocument();
  });
});

describe("DirectoryBody", () => {
  it("renders multiple store cards", () => {
    const stores = Array.from({ length: 5 }, (_, i) =>
      makeStore({ id: i + 1, name: `Store ${i + 1}`, discogs_username: `store${i + 1}` }),
    );
    render(<ExploreDirectory {...makeProps({ stores })} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Store ${i}`)).toBeInTheDocument();
    }
  });

  it("renders All Stores section header", () => {
    const stores = [makeStore()];
    render(<ExploreDirectory {...makeProps({ stores })} />);
    expect(screen.getByRole("heading", { name: /all stores/i })).toBeInTheDocument();
  });
});
