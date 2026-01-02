import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  UtensilsCrossed,
  Calendar,
  Camera,
  ClipboardList,
  User,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  BadgeEuro,
  Clock,
  Gift,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/**
 * AuftragPilot MVP (2-in-1 Demo)
 * - Handwerk (aktiv): Lead-Preischeck + Upload + Termin + Admin-Leadboard
 * - Gastro (bereit): Reservierung + Vorbestellung + Rewards + Admin-Board
 *
 * Hinweis: Diese Version nutzt localStorage (MVP). Später Supabase/DB.
 */

const LS_KEY = "auftragpilot_mvp_v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStore(store) {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

const defaultStore = {
  handwerk: {
    leads: [],
  },
  gastro: {
    reservations: [],
    guests: [],
  },
};

const SERVICES = [
  { id: "paint", name: "Malerarbeiten", base: 200, unitLabel: "m²", pricePerUnit: 12 },
  { id: "sanitary", name: "Sanitär / Heizung", base: 180, unitLabel: "Umfang", pricePerUnit: 0 },
  { id: "electro", name: "Elektrik (Steckdosen/Punkte)", base: 150, unitLabel: "Punkte", pricePerUnit: 40 },
  { id: "floor", name: "Boden verlegen", base: 400, unitLabel: "m²", pricePerUnit: 38 },
];

const URGENCY = [
  { id: "soon", name: "Schnell (1–7 Tage)", factor: 1.15 },
  { id: "normal", name: "Normal (1–4 Wochen)", factor: 1.0 },
  { id: "later", name: "Später (1–3 Monate)", factor: 0.9 },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatEUR(n) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n)} €`;
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Pill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-sm shadow-sm">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </span>
  );
}

function Card({ title, subtitle, icon: Icon, children, right }) {
  return (
    <div className="rounded-2xl border bg-white/80 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border bg-white p-2 shadow-sm">
            {Icon ? <Icon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-lg font-semibold">{title}</div>
            {subtitle ? <div className="text-sm text-neutral-600">{subtitle}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none",
        "focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200",
        props.className
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={classNames(
        "w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none",
        "focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200",
        props.className
      )}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={classNames(
        "w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none",
        "focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200",
        props.className
      )}
    />
  );
}

function Button({ variant = "primary", leftIcon: Icon, children, ...props }) {
  const styles =
    variant === "primary"
      ? "bg-neutral-900 text-white hover:bg-neutral-800"
      : variant === "ghost"
        ? "bg-white text-neutral-900 hover:bg-neutral-50"
        : "bg-white text-neutral-900 hover:bg-neutral-50 border";
  return (
    <button
      {...props}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        props.className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-600">{label}</div>
          <div className="mt-1 text-xl font-semibold">{value}</div>
        </div>
        <div className="rounded-xl border bg-white p-2">
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, action }) {
  return (
    <div className="rounded-2xl border bg-white/60 p-8 text-center shadow-sm">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border bg-white shadow-sm">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="text-lg font-semibold">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-neutral-600">{subtitle}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function estimate(serviceId, qty, urgencyId) {
  const svc = SERVICES.find((s) => s.id === serviceId) || SERVICES[0];
  const urg = URGENCY.find((u) => u.id === urgencyId) || URGENCY[1];

  let base = svc.base;
  let variable = 0;

  if (serviceId === "sanitary") {
    // simple tiers based on project type selected in form
    // handled outside; here we keep base
    variable = 0;
  } else {
    variable = Math.max(0, Number(qty || 0)) * svc.pricePerUnit;
  }

  const raw = (base + variable) * urg.factor;

  // range +/- ~12%
  const low = Math.round(raw * 0.88);
  const high = Math.round(raw * 1.12);
  return { low, high, svcName: svc.name };
}

function scoreLead(lead) {
  let score = 0;
  const hasPhotos = (lead.photos || []).length > 0;
  if (hasPhotos) score += 30;
  if (lead.urgency === "soon") score += 20;
  if ((lead.qty || 0) >= 40) score += 15;
  if ((lead.details || "").trim().length >= 30) score += 10;
  if ((lead.name || "").trim() && (lead.phone || "").trim()) score += 15;
  if (lead.service === "sanitary") score += 10; // higher value

  const tier = score >= 70 ? "Hot" : score >= 45 ? "Warm" : "Kalt";
  return { score, tier };
}

function Badge({ tier }) {
  const map = {
    Hot: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Warm: "border-amber-200 bg-amber-50 text-amber-800",
    Kalt: "border-neutral-200 bg-white text-neutral-700",
  };
  return (
    <span className={classNames("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", map[tier] || map.Kalt)}>
      {tier}
    </span>
  );
}

function NavTab({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 hover:bg-neutral-50 border"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function LeadForm({ onCreate }) {
  const [service, setService] = useState("paint");
  const [urgency, setUrgency] = useState("normal");
  const [qty, setQty] = useState(30);
  const [sanitaryType, setSanitaryType] = useState("repair");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [date, setDate] = useState(addDaysISO(2));
  const [time, setTime] = useState("09:00");
  const [photos, setPhotos] = useState([]);

  const isSanitary = service === "sanitary";

  const est = useMemo(() => {
    if (isSanitary) {
      // quick tiers
      const baseMap = {
        repair: { low: 180, high: 450 },
        heating: { low: 350, high: 1200 },
        partial_bath: { low: 2500, high: 6000 },
        full_bath: { low: 6000, high: 12000 },
      };
      const b = baseMap[sanitaryType] || baseMap.repair;
      const urg = URGENCY.find((u) => u.id === urgency) || URGENCY[1];
      return {
        low: Math.round(b.low * urg.factor),
        high: Math.round(b.high * urg.factor),
        svcName: "Sanitär / Heizung",
      };
    }
    return estimate(service, qty, urgency);
  }, [service, qty, urgency, isSanitary, sanitaryType]);

  const canSubmit = useMemo(() => {
    if (!name.trim() || !phone.trim() || !zip.trim()) return false;
    if (isSanitary && photos.length === 0) return false;
    return true;
  }, [name, phone, zip, isSanitary, photos.length]);

  function addPhotoFiles(fileList) {
    const files = Array.from(fileList || []);
    const readers = files.slice(0, 8).map(
      (f) =>
        new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve({ id: uid("p"), name: f.name, dataUrl: String(r.result || "") });
          r.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((items) => {
      setPhotos((prev) => [...prev, ...items].slice(0, 10));
    });
  }

  function submit() {
    const lead = {
      id: uid("lead"),
      createdAt: new Date().toISOString(),
      service,
      urgency,
      qty: isSanitary ? 0 : Number(qty || 0),
      sanitaryType: isSanitary ? sanitaryType : null,
      details,
      name,
      phone,
      email,
      zip,
      appointment: { date, time },
      photos,
      estimate: est,
      status: "Neu",
    };
    onCreate(lead);
    // reset minimal
    setDetails("");
    setPhotos([]);
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Gewerk">
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dringlichkeit">
          <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            {URGENCY.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>

        {!isSanitary ? (
          <Field label={`Menge (${SERVICES.find((s) => s.id === service)?.unitLabel || ""})`} hint="z.B. Fläche / Anzahl">
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        ) : (
          <Field label="Art des Sanitär-Projekts" hint="Fotos sind Pflicht">
            <Select value={sanitaryType} onChange={(e) => setSanitaryType(e.target.value)}>
              <option value="repair">Reparatur / Leck / Armatur</option>
              <option value="heating">Heizung / Thermen-Service</option>
              <option value="partial_bath">Bad-Teilsanierung</option>
              <option value="full_bath">Bad-Komplettsanierung</option>
            </Select>
          </Field>
        )}

        <Field label="PLZ" hint="für die Zuordnung">
          <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="z.B. 50667" />
        </Field>
      </div>

      <Card
        title="Richtpreis (Schätzung)"
        subtitle="Endpreis nach Besichtigung / Rückfragen"
        icon={BadgeEuro}
        right={<Pill icon={Clock}>{URGENCY.find((u) => u.id === urgency)?.name}</Pill>}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-semibold">
              {formatEUR(est.low)} – {formatEUR(est.high)}
            </div>
            <div className="mt-1 text-sm text-neutral-600">Gewerk: {est.svcName}</div>
          </div>
          <Pill icon={CheckCircle2}>unverbindlich</Pill>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Terminwunsch (Datum)">
          <Input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Uhrzeit">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      <Field label="Kurzbeschreibung" hint="z.B. Raum, Zustand, Zugang, Besonderheiten">
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Beschreiben Sie kurz das Projekt…" />
      </Field>

      <Card title="Fotos" subtitle={isSanitary ? "Bei Sanitär: mindestens 1 Foto erforderlich" : "Optional, erhöht die Qualität"} icon={Camera}>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addPhotoFiles(e.target.files)}
            className="max-w-xs"
          />
          <Pill icon={ClipboardList}>{photos.length}/10</Pill>
        </div>

        {photos.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border bg-white">
                <img src={p.dataUrl} alt={p.name} className="h-28 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-neutral-600">Noch keine Fotos hochgeladen.</div>
        )}
      </Card>

      <Card title="Kontakt" subtitle="Damit der Betrieb Sie erreichen kann" icon={User}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Max Mustermann" />
          </Field>
          <Field label="Telefon" hint="Pflicht">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0151…" />
          </Field>
          <Field label="E-Mail" hint="optional">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@beispiel.de" />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-neutral-600">
            Mit Klick auf „Anfrage senden“ wird Ihre Anfrage im Demo-Dashboard gespeichert.
          </div>
          <Button leftIcon={ArrowRight} disabled={!canSubmit} onClick={submit}>
            Anfrage senden
          </Button>
        </div>
        {!canSubmit ? (
          <div className="mt-2 text-xs text-neutral-500">
            Pflicht: Name, Telefon, PLZ{isSanitary ? ", mindestens 1 Foto (Sanitär)" : ""}.
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function LeadsAdmin({ leads, onUpdate, onSeed, onClear }) {
  const [q, setQ] = useState("");
  const [service, setService] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);

  const enriched = useMemo(() => {
    return leads.map((l) => ({ ...l, ...scoreLead(l) }));
  }, [leads]);

  const filtered = useMemo(() => {
    return enriched
      .filter((l) => (service === "all" ? true : l.service === service))
      .filter((l) => (status === "all" ? true : l.status === status))
      .filter((l) => {
        if (!q.trim()) return true;
        const s = `${l.name} ${l.zip} ${l.details} ${l.phone}`.toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enriched, q, service, status]);

  const stats = useMemo(() => {
    const week = enriched.length;
    const neu = enriched.filter((l) => l.status === "Neu").length;
    const gewonnen = enriched.filter((l) => l.status === "Gewonnen").length;
    const value = enriched.reduce((sum, l) => sum + (l.estimate?.high || 0), 0);
    return { week, neu, gewonnen, value };
  }, [enriched]);

  function setLeadStatus(id, next) {
    onUpdate(id, { status: next });
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat label="Leads gesamt" value={stats.week} icon={ClipboardList} />
        <Stat label="Neu" value={stats.neu} icon={CheckCircle2} />
        <Stat label="Gewonnen" value={stats.gewonnen} icon={Sparkles} />
        <Stat label="Potenzial (Summe)" value={formatEUR(stats.value)} icon={BadgeEuro} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche (Name, PLZ, Text…)" className="pl-9 w-72" />
          </div>
          <Select value={service} onChange={(e) => setService(e.target.value)} className="w-56">
            <option value="all">Alle Gewerke</option>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="all">Alle Status</option>
            <option value="Neu">Neu</option>
            <option value="Kontaktiert">Kontaktiert</option>
            <option value="Angebot">Angebot</option>
            <option value="Gewonnen">Gewonnen</option>
            <option value="Verloren">Verloren</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leftIcon={Plus} onClick={onSeed}>
            Demo-Leads
          </Button>
          <Button variant="secondary" leftIcon={XCircle} onClick={onClear}>
            Löschen
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Noch keine Leads"
          subtitle="Erstelle eine Anfrage im Formular oder lade Demo-Leads."
          action={<Button leftIcon={Plus} onClick={onSeed}>Demo-Leads laden</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border bg-white/70 shadow-sm">
              <div className="grid grid-cols-12 gap-2 border-b bg-white/60 p-3 text-xs font-medium text-neutral-600">
                <div className="col-span-3">Kunde</div>
                <div className="col-span-3">Gewerk</div>
                <div className="col-span-2">Richtpreis</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Score</div>
              </div>
              <div className="max-h-[520px] overflow-auto">
                {filtered.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelected(l.id)}
                    className={classNames(
                      "grid w-full grid-cols-12 gap-2 border-b p-3 text-left text-sm hover:bg-neutral-50",
                      selected === l.id ? "bg-neutral-50" : "bg-transparent"
                    )}
                  >
                    <div className="col-span-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-neutral-500">PLZ {l.zip}</div>
                    </div>
                    <div className="col-span-3">
                      <div className="font-medium">{SERVICES.find((s) => s.id === l.service)?.name || l.service}</div>
                      <div className="text-xs text-neutral-500">
                        {l.urgency === "soon" ? "Schnell" : l.urgency === "later" ? "Später" : "Normal"} · {l.photos?.length || 0} Fotos
                      </div>
                    </div>
                    <div className="col-span-2 font-medium">
                      {formatEUR(l.estimate?.low || 0)}–{formatEUR(l.estimate?.high || 0)}
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex rounded-full border bg-white px-2.5 py-1 text-xs">{l.status}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Badge tier={l.tier} />
                      <span className="text-xs text-neutral-500">{l.score}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <LeadDetail
                    lead={enriched.find((x) => x.id === selected)}
                    onStatus={(next) => setLeadStatus(selected, next)}
                  />
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <EmptyState title="Lead auswählen" subtitle="Klicke links einen Lead an, um Details zu sehen." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadDetail({ lead, onStatus }) {
  if (!lead) return null;
  const svcName = SERVICES.find((s) => s.id === lead.service)?.name || lead.service;

  const statusOptions = ["Neu", "Kontaktiert", "Angebot", "Gewonnen", "Verloren"];

  return (
    <div className="rounded-2xl border bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{lead.name}</div>
          <div className="text-sm text-neutral-600">{svcName} · PLZ {lead.zip}</div>
        </div>
        <Badge tier={lead.tier} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between rounded-xl border bg-white p-3">
          <span className="text-neutral-600">Richtpreis</span>
          <span className="font-medium">
            {formatEUR(lead.estimate?.low || 0)} – {formatEUR(lead.estimate?.high || 0)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-white p-3">
          <span className="text-neutral-600">Telefon</span>
          <a className="font-medium underline" href={`tel:${lead.phone}`}>
            {lead.phone}
          </a>
        </div>
        {lead.email ? (
          <div className="flex items-center justify-between rounded-xl border bg-white p-3">
            <span className="text-neutral-600">E-Mail</span>
            <a className="font-medium underline" href={`mailto:${lead.email}`}>
              {lead.email}
            </a>
          </div>
        ) : null}
        <div className="flex items-center justify-between rounded-xl border bg-white p-3">
          <span className="text-neutral-600">Termin</span>
          <span className="font-medium">
            {lead.appointment?.date} · {lead.appointment?.time}
          </span>
        </div>
      </div>

      {lead.details ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-neutral-600">Beschreibung</div>
          <div className="mt-1 rounded-xl border bg-white p-3 text-sm">{lead.details}</div>
        </div>
      ) : null}

      {lead.photos?.length ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-neutral-600">Fotos</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {lead.photos.slice(0, 4).map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border bg-white">
                <img src={p.dataUrl} alt={p.name} className="h-24 w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-neutral-600">Keine Fotos.</div>
      )}

      <div className="mt-5">
        <div className="text-xs font-medium text-neutral-600">Status</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {statusOptions.map((s) => (
            <Button
              key={s}
              variant={lead.status === s ? "primary" : "secondary"}
              onClick={() => onStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header({ mode, setMode, section, setSection }) {
  return (
    <div className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-white shadow-sm">
            {mode === "handwerk" ? <Hammer className="h-5 w-5" /> : <UtensilsCrossed className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-base font-semibold">AuftragPilot MVP</div>
            <div className="text-xs text-neutral-600">Handwerk zuerst · Gastro bereit</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavTab active={mode === "handwerk"} icon={Hammer} label="Handwerk" onClick={() => { setMode("handwerk"); setSection("form"); }} />
          <NavTab active={mode === "gastro"} icon={UtensilsCrossed} label="Gastro" onClick={() => { setMode("gastro"); setSection("reserve"); }} />
        </div>

        <div className="flex items-center gap-2">
          {mode === "handwerk" ? (
            <>
              <NavTab active={section === "form"} icon={ClipboardList} label="Anfrage" onClick={() => setSection("form")} />
              <NavTab active={section === "admin"} icon={Calendar} label="Dashboard" onClick={() => setSection("admin")} />
            </>
          ) : (
            <>
              <NavTab active={section === "reserve"} icon={Calendar} label="Reservieren" onClick={() => setSection("reserve")} />
              <NavTab active={section === "gadmin"} icon={ClipboardList} label="Admin" onClick={() => setSection("gadmin")} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GastroStub({ store, setStore }) {
  // simple placeholder so you can see the structure. We can flesh this out next.
  return (
    <div className="grid gap-4">
      <Card title="Gastro-Modul" subtitle="bereit zum Ausbau (Reservierung + Vorbestellung + Rewards)" icon={UtensilsCrossed}>
        <div className="text-sm text-neutral-700">
          Dieses Modul ist als nächster Schritt vorgesehen. Wenn du willst, baue ich es als vollwertigen Flow aus (wie Handwerk):
          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
            <li>Reservierung (Datum/Uhrzeit/Personen)</li>
            <li>No-Show Reminder</li>
            <li>Vorbestellung</li>
            <li>Stammgastpunkte</li>
          </ul>
        </div>
      </Card>

      <EmptyState
        title="Noch keine Reservierungen"
        subtitle="(Platzhalter)"
        action={<Button leftIcon={Gift} onClick={() => {
          // no-op
        }}>Später aktivieren</Button>}
      />
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("handwerk"); // handwerk | gastro
  const [section, setSection] = useState("form");
  const [store, setStore] = useState(defaultStore);

  useEffect(() => {
    const s = loadStore();
    if (s) setStore(s);
  }, []);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  function addLead(lead) {
    setStore((prev) => ({
      ...prev,
      handwerk: { ...prev.handwerk, leads: [lead, ...prev.handwerk.leads] },
    }));
    setSection("admin");
  }

  function updateLead(id, patch) {
    setStore((prev) => ({
      ...prev,
      handwerk: {
        ...prev.handwerk,
        leads: prev.handwerk.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      },
    }));
  }

  function seedLeads() {
    const demo = [
      {
        id: uid("lead"),
        createdAt: new Date().toISOString(),
        service: "sanitary",
        urgency: "soon",
        qty: 0,
        sanitaryType: "partial_bath",
        details: "Teilsanierung Bad, Fliesen lösen sich, neue Armaturen. Zugang gut.",
        name: "Familie Becker",
        phone: "0157 1234567",
        email: "becker@example.com",
        zip: "50667",
        appointment: { date: addDaysISO(3), time: "10:30" },
        photos: [],
        estimate: { low: 2875, high: 6900, svcName: "Sanitär / Heizung" },
        status: "Neu",
      },
      {
        id: uid("lead"),
        createdAt: new Date().toISOString(),
        service: "paint",
        urgency: "normal",
        qty: 55,
        sanitaryType: null,
        details: "Wohnzimmer + Flur streichen, Decke inkl., Altbau. Farbberatung gewünscht.",
        name: "S. Mertens",
        phone: "0176 5553333",
        email: "mertens@example.com",
        zip: "20095",
        appointment: { date: addDaysISO(4), time: "14:00" },
        photos: [],
        estimate: estimate("paint", 55, "normal"),
        status: "Kontaktiert",
      },
      {
        id: uid("lead"),
        createdAt: new Date().toISOString(),
        service: "electro",
        urgency: "later",
        qty: 8,
        sanitaryType: null,
        details: "8 Steckdosen nachrüsten, Sicherungskasten prüfen, Neubau.",
        name: "Jan Peters",
        phone: "0151 9992222",
        email: "peters@example.com",
        zip: "10115",
        appointment: { date: addDaysISO(7), time: "09:30" },
        photos: [],
        estimate: estimate("electro", 8, "later"),
        status: "Neu",
      },
      {
        id: uid("lead"),
        createdAt: new Date().toISOString(),
        service: "floor",
        urgency: "normal",
        qty: 38,
        sanitaryType: null,
        details: "Vinyl verlegen in 2 Räumen (38 m²), Untergrund eben, Sockelleisten.",
        name: "Aylin Kaya",
        phone: "0170 4441111",
        email: "kaya@example.com",
        zip: "80331",
        appointment: { date: addDaysISO(5), time: "11:00" },
        photos: [],
        estimate: estimate("floor", 38, "normal"),
        status: "Angebot",
      },
    ];

    setStore((prev) => ({
      ...prev,
      handwerk: { ...prev.handwerk, leads: [...demo, ...prev.handwerk.leads] },
    }));
  }

  function clearLeads() {
    setStore((prev) => ({ ...prev, handwerk: { ...prev.handwerk, leads: [] } }));
  }

  return (
    <div className="min-h-screen">
      <Header mode={mode} setMode={setMode} section={section} setSection={setSection} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Pill icon={Sparkles}>MVP · localStorage</Pill>
          <Pill icon={BadgeEuro}>Abo + Pay-per-Lead (als nächster Schritt)</Pill>
          <Pill icon={Camera}>Fotos erhöhen Lead-Qualität</Pill>
        </div>

        {mode === "handwerk" ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card
                  title="Projekt anfragen (Endkunde)"
                  subtitle="Gewerk wählen → Richtpreis → Fotos → Termin"
                  icon={ClipboardList}
                  right={<Pill icon={Hammer}>Handwerk</Pill>}
                >
                  <LeadForm onCreate={addLead} />
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card
                  title="Demo-Hinweis"
                  subtitle="So testest du die App sofort"
                  icon={Sparkles}
                >
                  <ol className="list-decimal pl-5 text-sm text-neutral-700">
                    <li>Erstelle eine Anfrage links (z.B. Maler / Elektrik).</li>
                    <li>Du landest automatisch im Dashboard.</li>
                    <li>Klicke einen Lead an → Status ändern.</li>
                    <li>Oder lade Demo-Leads im Dashboard.</li>
                  </ol>
                  <div className="mt-4 text-sm text-neutral-600">
                    Tipp: Für Sanitär sind Fotos Pflicht (realistischer Lead-Filter).
                  </div>
                </Card>

                <div className="mt-4 rounded-2xl border bg-white/70 p-4 shadow-sm">
                  <div className="text-sm font-semibold">Nächster Ausbau</div>
                  <div className="mt-1 text-sm text-neutral-700">
                    Stripe-Zahlung (Abo + Lead-Freischaltung), Admin-Login, E-Mail/SMS, PLZ-Limits.
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {section === "admin" ? (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card title="Dashboard (Betrieb)" subtitle="Leads filtern, bewerten, Status setzen" icon={Calendar}>
                    <LeadsAdmin
                      leads={store.handwerk.leads}
                      onUpdate={updateLead}
                      onSeed={seedLeads}
                      onClear={clearLeads}
                    />
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid gap-4">
            <Card
              title="Gastro (nächster Schritt)"
              subtitle="Ich baue dir den Flow wie Handwerk – 1:1 verkaufsfertig"
              icon={UtensilsCrossed}
              right={<Pill icon={UtensilsCrossed}>Gastro</Pill>}
            >
              <GastroStub store={store} setStore={setStore} />
            </Card>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-xs text-neutral-500">
        Demo-MVP: Daten werden lokal im Browser gespeichert (localStorage). Für Produktion: Login + DB + Payments.
      </footer>
    </div>
  );
}
