import React from "react";
import { Metadata } from "next";
import AuthLayout from "../../components/layout/AuthLayout";
import { metadata as rootMetadata } from "../layout";

/**
 * Extends the root metadata with auth-specific title and description
 * for all authentication-related pages
 */
export const metadata: Metadata = {
  ...rootMetadata,
  title: "Authentication | Engagerr",
  description: "Access your Engagerr account to track content performance across platforms and connect with partnership opportunities.",
};

/**
 * Layout component specifically for authentication routes such as login, 
 * registration, and password reset. Provides a focused, distraction-free 
 * experience during the authentication process.
 * 
 * @param children - The page content to render within the authentication layout
 * @returns The authentication layout with rendered children
 */
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}