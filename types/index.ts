export type UserWithRelations = {
  id: string;
  email: string;
  name: string | null;
  facebookId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Stage = {
  id: string;
  name: string;
  order: number;
  eventName: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  photoUrl: string | null;
  userId: string;
  stageId: string | null;
  stage: Stage | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  adSetName: string | null;
  adName: string | null;
  adAccountName: string | null;
  platform: string | null;
  referrer: string | null;
  aiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Pixel = {
  id: string;
  pixelId: string;
  accessToken: string;
  adAccountId: string | null;
  metaAdsToken: string | null;
  selectedCampaignId: string | null;
  campaignObjective: string | null;
  conversionDestination: string | null;
  accountPhase: string | null;
  monthlyBudget: number | null;
  bidStrategy: string | null;
  businessSegment: string | null;
  coverageArea: string | null;
  conversionValue: number | null;
  maxCostPerResult: number | null;
  bidValue: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignConfig = {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignObjective: string;
  conversionDestination: string;
  businessSegment: string | null;
  conversionValue: number | null;
  maxCostPerResult: number | null;
  monthlyBudget: number | null;
  bidStrategy: string;
  bidValue: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  leadId: string;
  role: string;
  content: string;
  createdAt: Date;
};

export type LeadStageHistory = {
  id: string;
  leadId: string;
  stageId: string;
  stage: Stage;
  createdAt: Date;
};

export type PixelEvent = {
  id: string;
  leadId: string;
  eventName: string;
  stageName: string;
  platform: string;
  success: boolean;
  createdAt: Date;
};

export type LeadDetail = Lead & {
  messages: Message[];
  stageHistory: LeadStageHistory[];
  pixelEvents: PixelEvent[];
};

export type LeadSourceStats = {
  total: number;
  meta: number;
  google: number;
  whatsapp: number;
  manual: number;
  unknown: number;
};

export type KanbanColumn = Stage & {
  leads: Lead[];
};

export type AnalyticsData = {
  totalLeads: number;
  leadsByStage: Array<{
    stageId: string;
    stageName: string;
    count: number;
    percentage: number;
  }>;
  conversionRate: number;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
