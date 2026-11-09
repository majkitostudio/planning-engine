import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/login-form";

describe("přihlašovací formulář", () => {
  it("před spuštěním JavaScriptu neodesílá přihlašovací údaje metodou GET", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, { authConfigured: true, authMode: "database" }));
    expect(html).toMatch(/<form[^>]*method="post"/i);
    expect(html).toMatch(/<form[^>]*action="\/prihlaseni"/i);
  });
});
