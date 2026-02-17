export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_entitlements: {
        Row: {
          user_id: string;
          is_premium: boolean;
          premium_until: string | null;
          updated_at: string;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: string;
          current_period_end: string | null;
        };
        Insert: {
          user_id: string;
          is_premium?: boolean;
          premium_until?: string | null;
          updated_at?: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          current_period_end?: string | null;
        };
        Update: {
          user_id?: string;
          is_premium?: boolean;
          premium_until?: string | null;
          updated_at?: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          current_period_end?: string | null;
        };
        Relationships: [];
      };
      stripe_customers: {
        Row: {
          user_id: string;
          stripe_customer_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          stripe_customer_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
