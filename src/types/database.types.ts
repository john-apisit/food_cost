export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      store_settings: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          platform_name: string
          platform_fee_percent: number
          fixed_cost_box: number
          fixed_cost_bag: number
          target_food_cost_percent: number | null
          target_margin_percent: number | null
          store_name: string | null
          store_description: string | null
          logo_url: string | null
          banner_url: string | null
          open_time: string | null
          close_time: string | null
          open_days: string[]
          google_map_url: string | null
          address: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          platform_name?: string
          platform_fee_percent?: number
          fixed_cost_box?: number
          fixed_cost_bag?: number
          target_food_cost_percent?: number | null
          target_margin_percent?: number | null
          store_name?: string | null
          store_description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          open_time?: string | null
          close_time?: string | null
          open_days?: string[]
          google_map_url?: string | null
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          platform_name?: string
          platform_fee_percent?: number
          fixed_cost_box?: number
          fixed_cost_bag?: number
          target_food_cost_percent?: number | null
          target_margin_percent?: number | null
          store_name?: string | null
          store_description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          open_time?: string | null
          close_time?: string | null
          open_days?: string[]
          google_map_url?: string | null
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          name: string
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          name: string
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          name?: string
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          name: string
          unit: string
          price_per_unit: number
          type: 'ingredient' | 'packaging'
          category: string | null
          supplier_id: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          name: string
          unit: string
          price_per_unit: number
          type: 'ingredient' | 'packaging'
          category?: string | null
          supplier_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          name?: string
          unit?: string
          price_per_unit?: number
          type?: 'ingredient' | 'packaging'
          category?: string | null
          supplier_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredient_price_history: {
        Row: {
          id: string
          ingredient_id: string
          price_per_unit: number
          effective_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          ingredient_id: string
          price_per_unit: number
          effective_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          ingredient_id?: string
          price_per_unit?: number
          effective_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          name: string
          description: string | null
          sale_unit_type: 'box' | 'bag'
          selling_price: number
          category: string | null
          image_url: string | null
          status: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note: string | null
          prep_steps: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          name: string
          description?: string | null
          sale_unit_type: 'box' | 'bag'
          selling_price: number
          category?: string | null
          image_url?: string | null
          status?: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note?: string | null
          prep_steps?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          name?: string
          description?: string | null
          sale_unit_type?: 'box' | 'bag'
          selling_price?: number
          category?: string | null
          image_url?: string | null
          status?: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note?: string | null
          prep_steps?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_lines: {
        Row: {
          id: string
          menu_item_id: string
          ingredient_id: string
          quantity_per_unit: number
          created_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          ingredient_id: string
          quantity_per_unit: number
          created_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          ingredient_id?: string
          quantity_per_unit?: number
          created_at?: string
        }
        Relationships: []
      }
      menu_addons: {
        Row: {
          id: string
          menu_item_id: string
          addon_menu_item_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          addon_menu_item_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          addon_menu_item_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: []
      }
      combos: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          name: string
          description: string | null
          image_url: string | null
          status: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note: string | null
          selling_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          name: string
          description?: string | null
          image_url?: string | null
          status?: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note?: string | null
          selling_price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          status?: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note?: string | null
          selling_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      combo_items: {
        Row: {
          id: string
          combo_id: string
          menu_item_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          combo_id: string
          menu_item_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          combo_id?: string
          menu_item_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: []
      }
      purchase_plans: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          name: string
          days: number
          purchase_date: string | null
          sale_start_date: string | null
          sale_end_date: string | null
          is_template: boolean
          purchased_ingredient_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          name: string
          days?: number
          purchase_date?: string | null
          sale_start_date?: string | null
          sale_end_date?: string | null
          is_template?: boolean
          purchased_ingredient_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          name?: string
          days?: number
          purchase_date?: string | null
          sale_start_date?: string | null
          sale_end_date?: string | null
          is_template?: boolean
          purchased_ingredient_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_plan_lines: {
        Row: {
          id: string
          plan_id: string
          menu_item_id: string
          target_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          menu_item_id: string
          target_quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          menu_item_id?: string
          target_quantity?: number
          created_at?: string
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          plan_id: string | null
          menu_item_id: string
          target_qty: number | null
          actual_qty: number
          sale_date: string
          recorded_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          plan_id?: string | null
          menu_item_id: string
          target_qty?: number | null
          actual_qty: number
          sale_date?: string
          recorded_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          plan_id?: string | null
          menu_item_id?: string
          target_qty?: number | null
          actual_qty?: number
          sale_date?: string
          recorded_at?: string
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          type: 'income' | 'expense' | 'transfer'
          category: string
          amount: number
          occurred_at: string
          payment_method: 'cash' | 'bank_transfer'
          counterparty: string | null
          note: string | null
          period_from: string | null
          period_to: string | null
          gross_amount: number | null
          fee_amount: number | null
          adjustment_amount: number | null
          ingredient_id: string | null
          supplier_id: string | null
          quantity: number | null
          unit: string | null
          is_asset: boolean
          plan_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          store_id: string
          type: 'income' | 'expense' | 'transfer'
          category: string
          amount: number
          occurred_at?: string
          payment_method?: 'cash' | 'bank_transfer'
          counterparty?: string | null
          note?: string | null
          period_from?: string | null
          period_to?: string | null
          gross_amount?: number | null
          fee_amount?: number | null
          adjustment_amount?: number | null
          ingredient_id?: string | null
          supplier_id?: string | null
          quantity?: number | null
          unit?: string | null
          is_asset?: boolean
          plan_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          type?: 'income' | 'expense' | 'transfer'
          category?: string
          amount?: number
          occurred_at?: string
          payment_method?: 'cash' | 'bank_transfer'
          counterparty?: string | null
          note?: string | null
          period_from?: string | null
          period_to?: string | null
          gross_amount?: number | null
          fee_amount?: number | null
          adjustment_amount?: number | null
          ingredient_id?: string | null
          supplier_id?: string | null
          quantity?: number | null
          unit?: string | null
          is_asset?: boolean
          plan_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_plan_restock_lines: {
        Row: {
          id: string
          plan_id: string
          ingredient_id: string
          quantity: number | null
          stock_status: 'low' | 'out'
          note: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          ingredient_id: string
          quantity?: number | null
          stock_status: 'low' | 'out'
          note?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          ingredient_id?: string
          quantity?: number | null
          stock_status?: 'low' | 'out'
          note?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          id: string
          user_id: string | null
          store_id: string
          name: string
          description: string | null
          kind: 'kitchen_prep' | 'stock_check' | 'custom'
          days: string[]
          start_time: string
          end_time: string
          include_packaging: boolean
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          store_id: string
          name: string
          description?: string | null
          kind: 'kitchen_prep' | 'stock_check' | 'custom'
          days?: string[]
          start_time: string
          end_time: string
          include_packaging?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          store_id?: string
          name?: string
          description?: string | null
          kind?: 'kitchen_prep' | 'stock_check' | 'custom'
          days?: string[]
          start_time?: string
          end_time?: string
          include_packaging?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      routine_items: {
        Row: {
          id: string
          routine_id: string
          title: string
          notes: string | null
          source: 'manual' | 'menu_prep' | 'ingredient'
          source_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          title: string
          notes?: string | null
          source?: 'manual' | 'menu_prep' | 'ingredient'
          source_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          title?: string
          notes?: string | null
          source?: 'manual' | 'menu_prep' | 'ingredient'
          source_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      routine_runs: {
        Row: {
          id: string
          routine_id: string
          store_id: string
          user_id: string | null
          run_date: string
          status: 'pending' | 'in_progress' | 'done' | 'skipped'
          note: string | null
          completed_at: string | null
          completed_by: string | null
          purchase_plan_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          store_id: string
          user_id?: string | null
          run_date: string
          status?: 'pending' | 'in_progress' | 'done' | 'skipped'
          note?: string | null
          completed_at?: string | null
          completed_by?: string | null
          purchase_plan_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          store_id?: string
          user_id?: string | null
          run_date?: string
          status?: 'pending' | 'in_progress' | 'done' | 'skipped'
          note?: string | null
          completed_at?: string | null
          completed_by?: string | null
          purchase_plan_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      routine_run_items: {
        Row: {
          id: string
          run_id: string
          template_item_id: string | null
          title: string
          notes: string | null
          source: 'manual' | 'menu_prep' | 'ingredient'
          source_id: string | null
          sort_order: number
          is_done: boolean
          done_at: string | null
          done_by: string | null
          stock_status: 'ok' | 'low' | 'out' | null
          restock_quantity: number | null
          item_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          template_item_id?: string | null
          title: string
          notes?: string | null
          source?: 'manual' | 'menu_prep' | 'ingredient'
          source_id?: string | null
          sort_order?: number
          is_done?: boolean
          done_at?: string | null
          done_by?: string | null
          stock_status?: 'ok' | 'low' | 'out' | null
          restock_quantity?: number | null
          item_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          template_item_id?: string | null
          title?: string
          notes?: string | null
          source?: 'manual' | 'menu_prep' | 'ingredient'
          source_id?: string | null
          sort_order?: number
          is_done?: boolean
          done_at?: string | null
          done_by?: string | null
          stock_status?: 'ok' | 'low' | 'out' | null
          restock_quantity?: number | null
          item_note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          last_store_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string
          display_name?: string | null
          last_store_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          last_store_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_members: {
        Row: {
          id: string
          store_id: string
          user_id: string
          role: 'admin' | 'store_manager'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          role: 'admin' | 'store_manager'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          role?: 'admin' | 'store_manager'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          role: 'admin' | 'store_manager'
          resource: string
          action: 'view' | 'create' | 'edit' | 'delete'
        }
        Insert: {
          role: 'admin' | 'store_manager'
          resource: string
          action: 'view' | 'create' | 'edit' | 'delete'
        }
        Update: {
          role?: 'admin' | 'store_manager'
          resource?: string
          action?: 'view' | 'create' | 'edit' | 'delete'
        }
        Relationships: []
      }
      store_invites: {
        Row: {
          id: string
          store_id: string
          email: string
          role: 'admin' | 'store_manager'
          token: string
          invited_by: string
          status: 'pending' | 'accepted' | 'expired' | 'cancelled'
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          email: string
          role: 'admin' | 'store_manager'
          token?: string
          invited_by: string
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          email?: string
          role?: 'admin' | 'store_manager'
          token?: string
          invited_by?: string
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_store: {
        Args: { p_name?: string | null }
        Returns: string
      }
      get_store_invite: {
        Args: { p_token: string }
        Returns: {
          store_id: string
          store_name: string
          role: string
          email: string
          status: string
          expires_at: string
        }[]
      }
      accept_store_invite: {
        Args: { p_token: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
