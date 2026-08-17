import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import {
  createHousehold,
  fetchDisplayName,
  fetchHousehold,
  joinHousehold,
  leaveHousehold,
  saveDisplayName,
} from "@/lib/household";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function HouseholdCard() {
  const qc = useQueryClient();
  const { data: household } = useQuery({ queryKey: ["household"], queryFn: fetchHousehold });
  const { data: savedName } = useQuery({ queryKey: ["displayName"], queryFn: fetchDisplayName });
  const [displayName, setDisplayName] = useState("");
  const [houseName, setHouseName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (savedName !== undefined) setDisplayName(savedName);
  }, [savedName]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["household"] });
    qc.invalidateQueries({ queryKey: ["family"] });
  };

  const nameMut = useMutation({
    mutationFn: () => saveDisplayName(displayName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["displayName"] });
      refresh();
      toast.success("Nimi salvestatud");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: () => createHousehold(houseName.trim()),
    onSuccess: () => {
      setHouseName("");
      refresh();
      toast.success("Pere loodud");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinMut = useMutation({
    mutationFn: () => joinHousehold(code),
    onSuccess: () => {
      setCode("");
      refresh();
      toast.success("Liitusid perega");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leaveMut = useMutation({
    mutationFn: leaveHousehold,
    onSuccess: () => {
      refresh();
      toast.success("Lahkusid perest");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> Pere
        </CardTitle>
        <CardDescription>
          Pereliikmed näevad ainult neid eelarveid ja eesmärke, mille oled märkinud jagatuks. Sinu
          kontojääke, palka ega üksiktehinguid nad ei näe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="display-name">Sinu nimi peres</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Kadri"
            />
          </div>
          <Button variant="outline" onClick={() => nameMut.mutate()}>
            Salvesta
          </Button>
        </div>

        {household ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{household.name}</p>
            <p className="text-sm text-muted-foreground">
              Kutsekood: <span className="font-mono font-semibold">{household.invite_code}</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => leaveMut.mutate()}>
              Lahku perest
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="house-name">Loo uus pere</Label>
              <div className="flex gap-2">
                <Input
                  id="house-name"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="Meie pere"
                />
                <Button onClick={() => createMut.mutate()}>Loo</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="join-code">Liitu kutsekoodiga</Label>
              <div className="flex gap-2">
                <Input
                  id="join-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                />
                <Button variant="outline" onClick={() => joinMut.mutate()}>
                  Liitu
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
