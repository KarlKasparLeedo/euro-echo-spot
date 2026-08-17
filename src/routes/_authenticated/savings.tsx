import { createFileRoute } from "@tanstack/react-router";
import { SavingsAccountCard } from "@/components/SavingsAccountCard";
import { MonthCloseCard } from "@/components/MonthCloseCard";

export const Route = createFileRoute("/_authenticated/savings")({
  head: () => ({
    meta: [
      { title: "Kogumiskonto | Finantsjälgija" },
      {
        name: "description",
        content:
          "Kogumiskonto jääk, kuu ülejäägi kandmine ning raha suunamine eesmärkidesse või ootamatute kulude katteks.",
      },
      { property: "og:title", content: "Kogumiskonto | Finantsjälgija" },
      {
        property: "og:description",
        content: "Halda kogumiskonto jääki, suuna raha eesmärkidesse või võta välja ootamatu kulu katteks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavingsPage,
});

function SavingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kogumiskonto</h1>
        <p className="text-sm text-muted-foreground">
          Siia koguneb kuu ülejääk. Siit otsustad, kui palju läheb eesmärkidesse ja kui palju jääb puhvriks.
        </p>
      </div>

      <MonthCloseCard />

      <SavingsAccountCard />
    </div>
  );
}
