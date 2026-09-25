export type WorkspaceIdentity = {
  actorLabel: string;
  role: "owner" | "admin" | "member" | "viewer";
  organizationId: string;
  businessId: string;
  commerceConnections: {
    business_id: string;
    organization_id: string;
    status: string;
    connection_health: string;
  }[];
  organizations: { id: string; name: string }[];
  businesses: {
    id: string;
    organization_id: string;
    name: string;
    business_type: string;
    currency: string;
    timezone: string;
  }[];
};
