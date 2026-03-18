"use client";

import { useState, useTransition, useRef, useEffect, lazy, Suspense } from "react";
import {
  X, ChevronLeft, ChevronRight, Users, MessageCircle, Eye, Rocket,
  ClipboardList, ShoppingCart, Globe, Upload, Info, Loader2,
  Zap, DollarSign, Target, TrendingUp, MapPin, Trash2, Navigation, LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WhatsAppIcon, MessengerIcon, InstagramIcon } from "@/components/icons/SourceIcons";
import {
  createCampaign,
  getFacebookPosts,
  getInstagramMedia,
  type SocialPost,
  type CreateCampaignInput,
} from "@/app/actions/meta";
import { saveCampaignConfig } from "@/app/actions/pixel";
import { CTA_OPTIONS } from "./shared";

// Dynamic import for map (Leaflet doesn't support SSR)
const LocationMap = lazy(() => import("./LocationMap").then((m) => ({ default: m.LocationMap })));
import type { MapPin as LocationMapPin } from "./LocationMap";

type Props = {
  onClose: () => void;
  onCreated: (campaignId: string) => void;
  userId?: string;
};

// ─── Goal definitions (consumer-friendly) ───

type GoalOption = {
  id: string;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
  bg: string;
  objective: string; // maps to CampaignConfig.campaignObjective
};

const GOALS: GoalOption[] = [
  {
    id: "seguidores",
    label: "Mais seguidores",
    description: "Alcance mais pessoas e ganhe seguidores",
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200 hover:bg-violet-100",
    objective: "AWARENESS",
  },
  {
    id: "mensagens",
    label: "Mais mensagens",
    description: "Receba mensagens no WhatsApp, Messenger ou Instagram",
    icon: MessageCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    objective: "MESSAGES",
  },
  {
    id: "visualizacao",
    label: "Mais visualizações",
    description: "Aumente as visualizações dos seus conteúdos",
    icon: Eye,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    objective: "AWARENESS",
  },
  {
    id: "impulsionar",
    label: "Impulsionar publicação",
    description: "Turbine um post do Feed, Story ou Reels",
    icon: Rocket,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    objective: "ENGAGEMENT",
  },
  {
    id: "trafego",
    label: "Visitas no site",
    description: "Leve mais pessoas para o seu site ou landing page",
    icon: Globe,
    color: "text-cyan-600",
    bg: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100",
    objective: "TRAFFIC",
  },
  {
    id: "leads",
    label: "Gerar leads",
    description: "Capture contatos de possíveis clientes",
    icon: ClipboardList,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
    objective: "LEADS",
  },
  {
    id: "vendas",
    label: "Vendas",
    description: "Promova produtos e gere vendas diretas",
    icon: ShoppingCart,
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    objective: "SALES",
  },
];

// ─── Bid strategy definitions ───

type StrategyCard = {
  id: string;
  label: string;
  description: string;
  icon: typeof Zap;
  tip: string;
};

const STRATEGIES: StrategyCard[] = [
  { id: "LOWEST_COST", label: "Menor Custo", description: "Automático — a Meta decide", icon: Zap, tip: "Recomendado para quem está começando" },
  { id: "COST_CAP", label: "Cost Cap", description: "Custo médio controlado", icon: DollarSign, tip: "Bom para controlar quanto paga por resultado" },
  { id: "BID_CAP", label: "Bid Cap", description: "Lance máximo por clique", icon: Target, tip: "Controle total do valor máximo do lance" },
  { id: "ROAS_MIN", label: "ROAS Mínimo", description: "Retorno garantido", icon: TrendingUp, tip: "Ideal para e-commerce com vendas diretas" },
];

// ─── Message destinations ───

const MSG_DESTINATIONS = [
  { id: "WHATSAPP", label: "WhatsApp", iconType: "whatsapp" as const },
  { id: "MESSENGER", label: "Messenger", iconType: "messenger" as const },
  { id: "INSTAGRAM_DIRECT", label: "Instagram Direct", iconType: "instagram" as const },
];

// ─── Location pin type (lat/lng + radius) ───

type LocationPin = LocationMapPin; // { id, lat, lng, radius, name }

const GENDER_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "male", label: "Masculino" },
  { id: "female", label: "Feminino" },
];

export function CreateCampaignWizard({ onClose, onCreated, userId }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Step 1
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  // Step 2
  const [campaignName, setCampaignName] = useState("");
  const [dailyBudget, setDailyBudget] = useState(20);
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST");
  const [msgDestination, setMsgDestination] = useState("WHATSAPP");
  // Targeting
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState("all");
  const [locationPins, setLocationPins] = useState<LocationPin[]>([]);
  const [bidValue, setBidValue] = useState<string>("");

  // Step 3 - Boost
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [postTab, setPostTab] = useState<"facebook" | "instagram">("facebook");

  // Step 3 - New creative
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const fileRef = useRef<HTMLInputElement>(null);

  const goalObj = GOALS.find((g) => g.id === selectedGoal);
  const isBoost = selectedGoal === "impulsionar";
  const isMessages = selectedGoal === "mensagens";

  // Auto-set CTA based on goal
  useEffect(() => {
    if (isMessages) setCta("WHATSAPP_MESSAGE");
    else if (selectedGoal === "vendas") setCta("SHOP_NOW");
    else if (selectedGoal === "leads") setCta("SIGN_UP");
    else if (selectedGoal === "trafego") setCta("LEARN_MORE");
  }, [selectedGoal, isMessages]);

  // Load posts when entering step 3 for boost
  useEffect(() => {
    if (step === 3 && isBoost && posts.length === 0 && !loadingPosts) {
      setLoadingPosts(true);
      Promise.all([getFacebookPosts(), getInstagramMedia()])
        .then(([fb, ig]) => setPosts([...fb, ...ig]))
        .finally(() => setLoadingPosts(false));
    }
  }, [step, isBoost, posts.length, loadingPosts]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return !!selectedGoal;
      case 2: return !!campaignName.trim() && dailyBudget >= 5;
      case 3:
        if (isBoost) return !!selectedPost;
        // For non-boost, content is optional (can add later)
        return true;
      default: return true;
    }
  }

  function handleCreate() {
    if (!selectedGoal || !campaignName.trim()) return;

    startTransition(async () => {
      const input: CreateCampaignInput = {
        name: campaignName.trim(),
        goal: selectedGoal,
        dailyBudget,
        bidStrategy,
        bidValue: bidValue ? parseFloat(bidValue) : undefined,
        destination: isMessages ? msgDestination : undefined,
        postId: isBoost && selectedPost ? selectedPost.id : undefined,
        imageBase64: !isBoost && imageBase64 ? imageBase64 : undefined,
        primaryText: !isBoost ? primaryText.trim() || undefined : undefined,
        headline: !isBoost ? headline.trim() || undefined : undefined,
        linkUrl: !isBoost ? linkUrl.trim() || undefined : undefined,
        callToAction: cta,
        ageMin,
        ageMax,
        gender: gender === "all" ? undefined : gender === "male" ? 1 : 2,
        geoLocations: locationPins.length > 0 ? locationPins.map((p) => ({
          key: "",
          name: p.name,
          type: "custom_location",
          latitude: p.lat,
          longitude: p.lng,
          radius: p.radius,
        })) : undefined,
      };

      const result = await createCampaign(input);

      if (result.success && result.campaignId) {
        // Auto-save CampaignConfig
        if (userId && goalObj) {
          try {
            await saveCampaignConfig({
              campaignId: result.campaignId,
              campaignName: campaignName.trim(),
              campaignObjective: goalObj.objective,
              conversionDestination: isMessages ? msgDestination : selectedGoal === "trafego" ? "WEBSITE" : "WHATSAPP",
              businessSegment: null,
              conversionValue: null,
              monthlyBudget: dailyBudget * 30,
              maxCostPerResult: null,
              bidStrategy,
              bidValue: null,
            });
          } catch {
            // Non-critical, config can be set later
          }
        }

        toast.success("Campanha criada com sucesso!");
        onCreated(result.campaignId);
        onClose();
      } else {
        toast.error(result.error ?? "Erro ao criar campanha");
      }
    });
  }

  const filteredPosts = posts.filter((p) => p.type === postTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nova Campanha</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Passo {step} de 4</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? "bg-indigo-500" : s < step ? "bg-indigo-300" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && <Step1Goals selected={selectedGoal} onSelect={setSelectedGoal} />}
          {step === 2 && (
            <Step2Config
              name={campaignName} onNameChange={setCampaignName}
              budget={dailyBudget} onBudgetChange={setDailyBudget}
              strategy={bidStrategy} onStrategyChange={setBidStrategy}
              isMessages={isMessages}
              msgDestination={msgDestination} onMsgDestChange={setMsgDestination}
              ageMin={ageMin} onAgeMinChange={setAgeMin}
              ageMax={ageMax} onAgeMaxChange={setAgeMax}
              gender={gender} onGenderChange={setGender}
              locationPins={locationPins} onLocationPinsChange={setLocationPins}
              bidValue={bidValue} onBidValueChange={setBidValue}
            />
          )}
          {step === 3 && (
            isBoost ? (
              <Step3Boost
                loading={loadingPosts}
                posts={filteredPosts}
                selected={selectedPost}
                onSelect={setSelectedPost}
                tab={postTab}
                onTabChange={setPostTab}
              />
            ) : (
              <Step3Creative
                imagePreview={imagePreview}
                onImageChange={handleImage}
                onClearImage={() => { setImagePreview(null); setImageBase64(null); }}
                fileRef={fileRef}
                primaryText={primaryText} onPrimaryTextChange={setPrimaryText}
                headline={headline} onHeadlineChange={setHeadline}
                linkUrl={linkUrl} onLinkUrlChange={setLinkUrl}
                cta={cta} onCtaChange={setCta}
                goalId={selectedGoal}
              />
            )
          )}
          {step === 4 && (
            <Step4Review
              goal={goalObj}
              name={campaignName}
              budget={dailyBudget}
              strategy={STRATEGIES.find((s) => s.id === bidStrategy)?.label ?? bidStrategy}
              isBoost={isBoost}
              selectedPost={selectedPost}
              hasCreative={!!imageBase64}
              destination={isMessages ? MSG_DESTINATIONS.find((d) => d.id === msgDestination)?.label : undefined}
              ageMin={ageMin}
              ageMax={ageMax}
              gender={gender}
              locationPins={locationPins}
              bidValue={bidValue}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 flex-shrink-0">
          <div>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="rounded-xl text-xs gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Cancelar
            </Button>
            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="rounded-xl text-xs gap-1"
              >
                Próximo <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isPending}
                className="rounded-xl text-xs gap-1.5"
              >
                {isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...</>
                ) : (
                  <><Rocket className="h-3.5 w-3.5" /> Criar Campanha</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Goal Selection ───

function Step1Goals({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Qual é o seu objetivo?</h4>
        <p className="text-xs text-slate-400 mt-0.5">Escolha o que você quer alcançar com esta campanha</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const isSelected = selected === goal.id;
          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? `${goal.bg} ring-2 ring-offset-1 ring-indigo-400`
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? goal.bg.split(" ")[0] : "bg-slate-100"}`}>
                <Icon className={`h-4.5 w-4.5 ${isSelected ? goal.color : "text-slate-400"}`} />
              </div>
              <div>
                <p className={`text-xs font-semibold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{goal.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{goal.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Campaign Config ───

function Step2Config({
  name, onNameChange, budget, onBudgetChange,
  strategy, onStrategyChange,
  isMessages, msgDestination, onMsgDestChange,
  ageMin, onAgeMinChange, ageMax, onAgeMaxChange,
  gender, onGenderChange,
  locationPins, onLocationPinsChange,
  bidValue, onBidValueChange,
}: {
  name: string; onNameChange: (v: string) => void;
  budget: number; onBudgetChange: (v: number) => void;
  strategy: string; onStrategyChange: (v: string) => void;
  isMessages: boolean;
  msgDestination: string; onMsgDestChange: (v: string) => void;
  ageMin: number; onAgeMinChange: (v: number) => void;
  ageMax: number; onAgeMaxChange: (v: number) => void;
  gender: string; onGenderChange: (v: string) => void;
  locationPins: LocationPin[]; onLocationPinsChange: (v: LocationPin[]) => void;
  bidValue: string; onBidValueChange: (v: string) => void;
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [addPinMode, setAddPinMode] = useState(false);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`);
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const parts = [addr.road, addr.suburb, addr.city || addr.town || addr.village].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : data.display_name?.split(",").slice(0, 3).join(",") || "Local selecionado";
      }
      return data.display_name?.split(",").slice(0, 3).join(",") || "Local selecionado";
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async function handleAddPin(lat: number, lng: number) {
    const name = await reverseGeocode(lat, lng);
    onLocationPinsChange([...locationPins, { id: crypto.randomUUID(), lat, lng, radius: 10, name }]);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada neste navegador.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleAddPin(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      () => {
        alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleBudgetInput(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 9999) onBudgetChange(n);
    else if (val === "") onBudgetChange(1);
  }

  const needsBidValue = strategy === "COST_CAP" || strategy === "BID_CAP" || strategy === "ROAS_MIN";
  const bidLabel = strategy === "BID_CAP" ? "Lance máximo (R$)" : strategy === "ROAS_MIN" ? "ROAS mínimo" : "Custo máx. por resultado (R$)";

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Configure sua campanha</h4>
        <p className="text-xs text-slate-400 mt-0.5">Defina nome, orçamento, público e estratégia</p>
      </div>

      {/* Name */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Nome da campanha</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Promo Março, Black Friday..."
          className="mt-1 text-sm rounded-xl"
        />
      </div>

      {/* Message destination */}
      {isMessages && (
        <div>
          <Label className="text-xs font-medium text-slate-700">Para onde enviar as mensagens?</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {MSG_DESTINATIONS.map((d) => {
              const IconMap = { whatsapp: WhatsAppIcon, messenger: MessengerIcon, instagram: InstagramIcon };
              const MsgIcon = IconMap[d.iconType];
              return (
                <button
                  key={d.id}
                  onClick={() => onMsgDestChange(d.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    msgDestination === d.id
                      ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <MsgIcon size={28} />
                  <p className="text-[10px] font-medium text-slate-700">{d.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Budget — slider + manual input */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Gasto diário</Label>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400">R$</span>
          <Input
            type="number"
            min={1}
            max={9999}
            value={budget}
            onChange={(e) => handleBudgetInput(e.target.value)}
            className="w-24 text-sm rounded-xl text-center font-bold text-indigo-600"
          />
          <input
            type="range"
            min={5}
            max={500}
            step={1}
            value={Math.min(budget, 500)}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>R$ 5/dia</span>
          <span className="text-slate-600 font-medium">≈ R$ {(budget * 30).toLocaleString("pt-BR")}/mês</span>
          <span>R$ 500+/dia</span>
        </div>
      </div>

      {/* ─── Targeting Section ─── */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <Label className="text-xs font-bold text-slate-800">Público-alvo</Label>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Advantage+</span>
        </div>
        <p className="text-[10px] text-slate-400 -mt-2">
          Defina o público sugerido. O Advantage+ da Meta expande automaticamente para alcançar as melhores pessoas.
        </p>

        {/* Age */}
        <div>
          <Label className="text-xs font-medium text-slate-700">Idade</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <select
              value={ageMin}
              onChange={(e) => onAgeMinChange(Number(e.target.value))}
              className="text-xs rounded-xl border border-slate-200 px-2 py-1.5 bg-white"
            >
              {Array.from({ length: 48 }, (_, i) => i + 18).map((age) => (
                <option key={age} value={age}>{age} anos</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">até</span>
            <select
              value={ageMax}
              onChange={(e) => onAgeMaxChange(Number(e.target.value))}
              className="text-xs rounded-xl border border-slate-200 px-2 py-1.5 bg-white"
            >
              {Array.from({ length: 48 }, (_, i) => i + 18).filter((a) => a >= ageMin).map((age) => (
                <option key={age} value={age}>{age} anos</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gender */}
        <div>
          <Label className="text-xs font-medium text-slate-700">Gênero</Label>
          <div className="flex gap-2 mt-1.5">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g.id}
                onClick={() => onGenderChange(g.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  gender === g.id
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location — Interactive Map */}
        <div>
          <Label className="text-xs font-medium text-slate-700">
            Localização {locationPins.length > 0 ? `(${locationPins.length} pino${locationPins.length > 1 ? "s" : ""})` : "(Brasil inteiro)"}
          </Label>
          <p className="text-[10px] text-slate-400 mt-0.5 mb-2">
            Clique no mapa ou use sua localização para adicionar pinos com raio. Sem pinos = Brasil inteiro.
          </p>

          {/* Actions */}
          <div className="flex gap-2 mb-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseMyLocation}
              disabled={geoLoading}
              className="rounded-xl text-xs gap-1.5"
            >
              {geoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
              Usar minha localização
            </Button>
            <Button
              type="button"
              variant={addPinMode ? "default" : "outline"}
              size="sm"
              onClick={() => setAddPinMode(!addPinMode)}
              className={`rounded-xl text-xs gap-1.5 ${addPinMode ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
            >
              <MapPin className="h-3 w-3" />
              {addPinMode ? "Posicionando pino..." : "Adicionar pino"}
            </Button>
          </div>

          {/* Map — always visible */}
          <Suspense fallback={<div className="w-full h-[220px] rounded-xl bg-slate-100 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>}>
            <LocationMap
              pins={locationPins}
              onAddPin={handleAddPin}
              height={220}
              addMode={addPinMode}
              onPinPlaced={() => setAddPinMode(false)}
            />
          </Suspense>

          {/* Pin list with editable radius */}
          {locationPins.length > 0 && (
            <div className="space-y-2 mt-3">
              {locationPins.map((pin, idx) => (
                <div key={pin.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-2">
                  <Navigation className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-indigo-700 truncate">{pin.name}</p>
                    <p className="text-[9px] text-indigo-500">{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Input
                      type="number"
                      value={pin.radius}
                      onChange={(e) => {
                        const updated = [...locationPins];
                        updated[idx] = { ...pin, radius: Math.max(1, Math.min(80, Number(e.target.value) || 1)) };
                        onLocationPinsChange(updated);
                      }}
                      min={1}
                      max={80}
                      className="w-14 h-7 text-xs rounded-lg text-center"
                    />
                    <span className="text-[10px] text-slate-400">km</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLocationPinsChange(locationPins.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bid Strategy */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Estratégia de lance</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {STRATEGIES.map((s) => {
            const SIcon = s.icon;
            const isSelected = strategy === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onStrategyChange(s.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <SIcon className={`h-4 w-4 mb-1 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                <p className="text-[10px] text-slate-400">{s.description}</p>
                {isSelected && (
                  <p className="text-[10px] text-indigo-600 font-medium mt-1">{s.tip}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Bid value field — shown when strategy requires it */}
        {needsBidValue && (
          <div className="mt-3">
            <Label className="text-xs font-medium text-slate-700">{bidLabel}</Label>
            <div className="flex items-center gap-2 mt-1">
              {strategy !== "ROAS_MIN" && <span className="text-xs text-slate-400">R$</span>}
              <Input
                type="number"
                value={bidValue}
                onChange={(e) => onBidValueChange(e.target.value)}
                placeholder={strategy === "ROAS_MIN" ? "Ex: 3.0" : strategy === "BID_CAP" ? "Ex: 10" : "Ex: 25"}
                min={0}
                step={strategy === "ROAS_MIN" ? "0.1" : "1"}
                className="w-32 text-sm rounded-xl"
              />
              {strategy === "ROAS_MIN" && <span className="text-[10px] text-slate-400">x retorno</span>}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {strategy === "COST_CAP" && "A Meta vai tentar manter o custo médio por resultado abaixo desse valor."}
              {strategy === "BID_CAP" && "O lance máximo que a Meta pode dar por clique no leilão."}
              {strategy === "ROAS_MIN" && "A Meta só vai gastar se o retorno estimado for acima desse múltiplo."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Boost Post ───

function Step3Boost({
  loading, posts, selected, onSelect, tab, onTabChange,
}: {
  loading: boolean;
  posts: SocialPost[];
  selected: SocialPost | null;
  onSelect: (p: SocialPost) => void;
  tab: "facebook" | "instagram";
  onTabChange: (t: "facebook" | "instagram") => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Escolha a publicação</h4>
        <p className="text-xs text-slate-400 mt-0.5">Selecione um post do Feed, Story ou Reels para impulsionar</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => onTabChange("facebook")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            tab === "facebook" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Facebook
        </button>
        <button
          onClick={() => onTabChange("instagram")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            tab === "instagram" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Instagram
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
          <p className="text-xs text-slate-400 mt-2">Carregando publicações...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-xs text-slate-400">Nenhuma publicação encontrada no {tab === "facebook" ? "Facebook" : "Instagram"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
          {posts.map((post) => {
            const isSelected = selected?.id === post.id;
            return (
              <button
                key={post.id}
                onClick={() => onSelect(post)}
                className={`rounded-xl border overflow-hidden text-left transition-all ${
                  isSelected
                    ? "ring-2 ring-indigo-400 border-indigo-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-slate-100 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400">Sem imagem</span>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-[10px] text-slate-600 line-clamp-2">{post.message || "Sem legenda"}</p>
                  {post.mediaType && (
                    <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">{post.mediaType}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: New Creative ───

function Step3Creative({
  imagePreview, onImageChange, onClearImage, fileRef,
  primaryText, onPrimaryTextChange,
  headline, onHeadlineChange,
  linkUrl, onLinkUrlChange,
  cta, onCtaChange,
  goalId,
}: {
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  primaryText: string; onPrimaryTextChange: (v: string) => void;
  headline: string; onHeadlineChange: (v: string) => void;
  linkUrl: string; onLinkUrlChange: (v: string) => void;
  cta: string; onCtaChange: (v: string) => void;
  goalId: string | null;
}) {
  const needsLink = goalId === "trafego" || goalId === "vendas";

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Conteúdo do anúncio</h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Opcional — você pode adicionar o criativo depois.
        </p>
      </div>

      {/* Image */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Imagem</Label>
        <div className="mt-1.5">
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
              <button
                onClick={onClearImage}
                className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow-sm hover:bg-white"
              >
                <X className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
            >
              <Upload className="h-5 w-5 text-slate-300" />
              <span className="text-[10px] text-slate-400">Clique para selecionar imagem (JPG/PNG, máx 10MB)</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} className="hidden" />
        </div>
      </div>

      {/* Primary Text */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Texto do anúncio</Label>
        <textarea
          value={primaryText}
          onChange={(e) => onPrimaryTextChange(e.target.value)}
          placeholder="O texto que aparece acima da imagem..."
          rows={3}
          className="mt-1 w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Headline */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Título</Label>
        <Input value={headline} onChange={(e) => onHeadlineChange(e.target.value)} placeholder="Título chamativo" className="mt-1 text-sm rounded-xl" />
      </div>

      {/* Link (for traffic/sales) */}
      {needsLink && (
        <div>
          <Label className="text-xs font-medium text-slate-700">URL de destino</Label>
          <Input value={linkUrl} onChange={(e) => onLinkUrlChange(e.target.value)} placeholder="https://..." className="mt-1 text-sm rounded-xl" />
        </div>
      )}

      {/* CTA */}
      <div>
        <Label className="text-xs font-medium text-slate-700">Botão de ação</Label>
        <select
          value={cta}
          onChange={(e) => onCtaChange(e.target.value)}
          className="mt-1 w-full text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {CTA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Step 4: Review ───

function Step4Review({
  goal, name, budget, strategy, isBoost, selectedPost, hasCreative, destination,
  ageMin, ageMax, gender, locationPins, bidValue,
}: {
  goal: GoalOption | undefined;
  name: string;
  budget: number;
  strategy: string;
  isBoost: boolean;
  selectedPost: SocialPost | null;
  hasCreative: boolean;
  destination?: string;
  ageMin: number;
  ageMax: number;
  gender: string;
  locationPins: LocationPin[];
  bidValue: string;
}) {
  const RIcon = goal?.icon ?? Rocket;
  const genderLabel = gender === "male" ? "Masculino" : gender === "female" ? "Feminino" : "Todos";
  const regionLabel = locationPins.length > 0 ? locationPins.map((p) => p.name).join(", ") : "Brasil inteiro";

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Revisar e criar</h4>
        <p className="text-xs text-slate-400 mt-0.5">Confira os detalhes antes de criar a campanha</p>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        {/* Goal */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${goal?.bg?.split(" ")[0] ?? "bg-slate-100"}`}>
            <RIcon className={`h-5 w-5 ${goal?.color ?? "text-slate-400"}`} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{goal?.label}</p>
            <p className="text-[10px] text-slate-400">{goal?.description}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 space-y-2">
          <ReviewRow label="Nome" value={name} />
          <ReviewRow label="Gasto diário" value={`R$ ${budget.toLocaleString("pt-BR")},00`} />
          <ReviewRow label="Estimativa mensal" value={`R$ ${(budget * 30).toLocaleString("pt-BR")},00`} />
          <ReviewRow label="Estratégia" value={strategy} />
          {bidValue && <ReviewRow label="Valor do lance" value={strategy.includes("ROAS") ? `${bidValue}x` : `R$ ${bidValue}`} />}
          {destination && <ReviewRow label="Destino" value={destination} />}
          <ReviewRow label="Idade" value={`${ageMin} - ${ageMax} anos`} />
          <ReviewRow label="Gênero" value={genderLabel} />
          <ReviewRow label="Localização" value={regionLabel} />
          {locationPins.map((pin, i) => (
            <ReviewRow key={i} label={`📍 ${pin.name}`} value={`${pin.radius} km`} />
          ))}
          {isBoost && selectedPost && (
            <ReviewRow label="Publicação" value={selectedPost.message?.substring(0, 60) || "Post selecionado"} />
          )}
          {!isBoost && (
            <ReviewRow label="Criativo" value={hasCreative ? "Imagem adicionada" : "Será adicionado depois"} />
          )}
        </div>
      </div>

      <div className="bg-emerald-50 rounded-xl p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-emerald-700 leading-relaxed">
          <span className="font-semibold">Advantage+ ativado</span> — A Meta vai expandir automaticamente o público para alcançar as melhores pessoas, usando seu público-alvo como sugestão inicial.
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-blue-700 leading-relaxed">
          A campanha será criada com status <span className="font-semibold">Pausada</span>.
          Após criar, você pode ativá-la pelo botão na aba Meta.
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
