import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "PocketFlow Rooms", template: "%s · PocketFlow Rooms" },
  description: "Run an ordered panel of agents that contributes only when it adds signal.",
};

const directionContract = `
<!-- impeccable-direction-c6640e29
THESIS: An agent room is an observation bench; the interface makes sequential evaluation tangible instead of imitating a generic messenger.
OWN-WORLD: Pale mineral surfaces, carbon ink, cobalt controls, amber assay states, ruled registers, and numbered specimen rails.
STORY: Create specialists, assemble their order, submit one prompt, and watch each instrument contribute or pass.
FIRST VIEWPORT: A fixed header tops a full-height three-pane bench; transcript dominates center, room index anchors left, live agent rail anchors right, composer stays within reach.
FORM: Research laboratory observation ledger, grounded direction 5, seed c6640e29.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <template data-design-contract="c6640e29" dangerouslySetInnerHTML={{ __html: directionContract }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
