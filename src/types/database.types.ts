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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
      ingredients: {
        Row: {
          id: string
          user_id: string
          name: string
          unit: string
          price_per_unit: number
          type: 'ingredient' | 'packaging'
          category: string | null
          supplier: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          unit: string
          price_per_unit: number
          type: 'ingredient' | 'packaging'
          category?: string | null
          supplier?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          unit?: string
          price_per_unit?: number
          type?: 'ingredient' | 'packaging'
          category?: string | null
          supplier?: string | null
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
          user_id: string
          name: string
          description: string | null
          sale_unit_type: 'box' | 'bag'
          selling_price: number
          category: string | null
          image_url: string | null
          status: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          sale_unit_type: 'box' | 'bag'
          selling_price: number
          category?: string | null
          image_url?: string | null
          status?: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          sale_unit_type?: 'box' | 'bag'
          selling_price?: number
          category?: string | null
          image_url?: string | null
          status?: 'ready_to_sell' | 'testing_recipe' | 'not_ready' | 'discontinued'
          status_note?: string | null
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
          user_id: string
          name: string
          selling_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          selling_price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
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
          user_id: string
          name: string
          days: number
          is_template: boolean
          purchased_ingredient_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          days?: number
          is_template?: boolean
          purchased_ingredient_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          days?: number
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
          user_id: string
          plan_id: string | null
          menu_item_id: string
          target_qty: number | null
          actual_qty: number
          recorded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          menu_item_id: string
          target_qty?: number | null
          actual_qty: number
          recorded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          menu_item_id?: string
          target_qty?: number | null
          actual_qty?: number
          recorded_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
