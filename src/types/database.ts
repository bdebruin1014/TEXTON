export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          record_id: string | null
          table_name: string | null
          timestamp: string
          user_email: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string | null
          timestamp?: string
          user_email?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string | null
          timestamp?: string
          user_email?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string | null
          created_at: string
          current_balance: number | null
          entity_id: string | null
          gl_account_id: string | null
          id: string
          routing_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          current_balance?: number | null
          entity_id?: string | null
          gl_account_id?: string | null
          id?: string
          routing_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          current_balance?: number | null
          entity_id?: string | null
          gl_account_id?: string | null
          id?: string
          routing_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          category: string | null
          check_number: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          import_batch: string | null
          import_source: string | null
          is_matched: boolean
          matched_je_line_id: string | null
          payee: string | null
          post_date: string | null
          reconciliation_id: string | null
          reference: string | null
          transaction_date: string
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          category?: string | null
          check_number?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          import_batch?: string | null
          import_source?: string | null
          is_matched?: boolean
          matched_je_line_id?: string | null
          payee?: string | null
          post_date?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          transaction_date: string
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          category?: string | null
          check_number?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          import_batch?: string | null
          import_source?: string | null
          is_matched?: boolean
          matched_je_line_id?: string | null
          payee?: string | null
          post_date?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          transaction_date?: string
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_je_line_id_fkey"
            columns: ["matched_je_line_id"]
            isOneToOne: false
            referencedRelation: "journal_entry_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_payments: {
        Row: {
          batch_number: string | null
          created_at: string
          entity_id: string | null
          id: string
          payment_count: number | null
          payment_date: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          payment_count?: number | null
          payment_date?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          payment_count?: number | null
          payment_date?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_payments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_lines: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number: string | null
          amount: number
          bill_id: string
          cost_code: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          job_id: string | null
          job_name: string | null
          line_number: number
          po_id: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bill_id: string
          cost_code?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          job_id?: string | null
          job_name?: string | null
          line_number?: number
          po_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bill_id?: string
          cost_code?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          job_id?: string | null
          job_name?: string | null
          line_number?: number
          po_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number | null
          approval_level: string | null
          approved_at: string | null
          approved_by: string | null
          bill_date: string
          bill_number: string | null
          cost_code: string | null
          created_at: string
          description: string | null
          due_date: string | null
          entity_id: string | null
          id: string
          job_name: string | null
          paid_amount: number | null
          po_id: string | null
          project_id: string | null
          status: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          approval_level?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bill_date?: string
          bill_number?: string | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          job_name?: string | null
          paid_amount?: number | null
          po_id?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          approval_level?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bill_date?: string
          bill_number?: string | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          job_name?: string | null
          paid_amount?: number | null
          po_id?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budgeted: number | null
          category: string | null
          committed: number | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          sort_order: number
          spent: number | null
          updated_at: string
        }
        Insert: {
          budgeted?: number | null
          category?: string | null
          committed?: number | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          sort_order?: number
          spent?: number | null
          updated_at?: string
        }
        Update: {
          budgeted?: number | null
          category?: string | null
          committed?: number | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string
          description: string | null
          end_date: string | null
          entity_id: string | null
          event_type: string | null
          id: string
          record_id: string | null
          record_type: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          entity_id?: string | null
          event_type?: string | null
          id?: string
          record_id?: string | null
          record_type?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          entity_id?: string | null
          event_type?: string | null
          id?: string
          record_id?: string | null
          record_type?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_calls: {
        Row: {
          amount_received: number | null
          call_date: string
          call_number: string | null
          created_at: string
          due_date: string | null
          fund_id: string | null
          fund_name: string | null
          id: string
          purpose: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount_received?: number | null
          call_date?: string
          call_number?: string | null
          created_at?: string
          due_date?: string | null
          fund_id?: string | null
          fund_name?: string | null
          id?: string
          purpose?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount_received?: number | null
          call_date?: string
          call_number?: string | null
          created_at?: string
          due_date?: string | null
          fund_id?: string | null
          fund_name?: string | null
          id?: string
          purpose?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_calls_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number | null
          approved_date: string | null
          co_number: number | null
          cost_code: string | null
          created_at: string
          description: string | null
          id: string
          job_id: string
          requested_by: string | null
          requested_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          approved_date?: string | null
          co_number?: number | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          requested_by?: string | null
          requested_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          approved_date?: string | null
          co_number?: number | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          requested_by?: string | null
          requested_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          created_at: string
          entity_id: string | null
          id: string
          is_active: boolean
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          normal_balance: string
          parent_id: string | null
          source_template_id: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          normal_balance?: string
          parent_id?: string | null
          source_template_id?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          normal_balance?: string
          parent_id?: string | null
          source_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "coa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      closeout_items: {
        Row: {
          completed: boolean
          completed_date: string | null
          created_at: string
          id: string
          item_name: string
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          id?: string
          item_name: string
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_date?: string | null
          created_at?: string
          id?: string
          item_name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closeout_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_template_items: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          description: string | null
          id: string
          is_group: boolean
          is_required: boolean
          parent_account: string | null
          root_type: string | null
          sort_order: number
          template_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          description?: string | null
          id?: string
          is_group?: boolean
          is_required?: boolean
          parent_account?: string | null
          root_type?: string | null
          sort_order?: number
          template_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          description?: string | null
          id?: string
          is_group?: boolean
          is_required?: boolean
          parent_account?: string | null
          root_type?: string | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coa_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entity_types: string[]
          id: string
          is_default: boolean
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_types?: string[]
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_types?: string[]
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "coa_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_type: string | null
          contact_count: number | null
          created_at: string
          email: string | null
          entity_id: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_type?: string | null
          contact_count?: number | null
          created_at?: string
          email?: string | null
          entity_id?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_type?: string | null
          contact_count?: number | null
          created_at?: string
          email?: string | null
          entity_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      comparable_sales: {
        Row: {
          address: string | null
          baths: number | null
          beds: number | null
          created_at: string
          id: string
          opportunity_id: string
          price_per_sqft: number | null
          sale_date: string | null
          sale_price: number | null
          square_footage: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          id?: string
          opportunity_id: string
          price_per_sqft?: number | null
          sale_date?: string | null
          sale_price?: number | null
          square_footage?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          id?: string
          opportunity_id?: string
          price_per_sqft?: number | null
          sale_date?: string | null
          sale_price?: number | null
          square_footage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparable_sales_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_assignments: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          record_id: string
          record_type: string
          role: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          record_id: string
          record_type: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean
          last_name: string | null
          name: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          name?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          name?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_book_fees: {
        Row: {
          am_fee: number | null
          bookkeeping: number | null
          builder_fee: number | null
          builder_warranty: number | null
          builders_risk: number | null
          cost_book_id: string
          created_at: string
          id: string
          pm_fee: number | null
          po_fee: number | null
          updated_at: string
          utilities: number | null
        }
        Insert: {
          am_fee?: number | null
          bookkeeping?: number | null
          builder_fee?: number | null
          builder_warranty?: number | null
          builders_risk?: number | null
          cost_book_id: string
          created_at?: string
          id?: string
          pm_fee?: number | null
          po_fee?: number | null
          updated_at?: string
          utilities?: number | null
        }
        Update: {
          am_fee?: number | null
          bookkeeping?: number | null
          builder_fee?: number | null
          builder_warranty?: number | null
          builders_risk?: number | null
          cost_book_id?: string
          created_at?: string
          id?: string
          pm_fee?: number | null
          po_fee?: number | null
          updated_at?: string
          utilities?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_book_fees_cost_book_id_fkey"
            columns: ["cost_book_id"]
            isOneToOne: true
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_book_line_items: {
        Row: {
          amount: number | null
          category: string | null
          cost_book_id: string
          created_at: string
          description: string | null
          floor_plan_id: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          cost_book_id: string
          created_at?: string
          description?: string | null
          floor_plan_id: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          cost_book_id?: string
          created_at?: string
          description?: string | null
          floor_plan_id?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_book_line_items_cost_book_id_fkey"
            columns: ["cost_book_id"]
            isOneToOne: false
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_book_line_items_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_book_plans: {
        Row: {
          base_construction_cost: number | null
          contract_snb: number | null
          contract_total: number | null
          cost_book_id: string
          cost_per_sf: number | null
          created_at: string
          dm_budget_snb: number | null
          dm_budget_total: number | null
          floor_plan_id: string
          id: string
          updated_at: string
        }
        Insert: {
          base_construction_cost?: number | null
          contract_snb?: number | null
          contract_total?: number | null
          cost_book_id: string
          cost_per_sf?: number | null
          created_at?: string
          dm_budget_snb?: number | null
          dm_budget_total?: number | null
          floor_plan_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          base_construction_cost?: number | null
          contract_snb?: number | null
          contract_total?: number | null
          cost_book_id?: string
          cost_per_sf?: number | null
          created_at?: string
          dm_budget_snb?: number | null
          dm_budget_total?: number | null
          floor_plan_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_book_plans_cost_book_id_fkey"
            columns: ["cost_book_id"]
            isOneToOne: false
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_book_plans_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_book_site_work: {
        Row: {
          amount: number | null
          cost_book_id: string
          created_at: string
          id: string
          site_work_item_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          cost_book_id: string
          created_at?: string
          id?: string
          site_work_item_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          cost_book_id?: string
          created_at?: string
          id?: string
          site_work_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_book_site_work_cost_book_id_fkey"
            columns: ["cost_book_id"]
            isOneToOne: false
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_book_site_work_site_work_item_id_fkey"
            columns: ["site_work_item_id"]
            isOneToOne: false
            referencedRelation: "site_work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_book_upgrades: {
        Row: {
          amount: number | null
          cost_book_id: string
          created_at: string
          id: string
          updated_at: string
          upgrade_package_id: string
        }
        Insert: {
          amount?: number | null
          cost_book_id: string
          created_at?: string
          id?: string
          updated_at?: string
          upgrade_package_id: string
        }
        Update: {
          amount?: number | null
          cost_book_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          upgrade_package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_book_upgrades_cost_book_id_fkey"
            columns: ["cost_book_id"]
            isOneToOne: false
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_book_upgrades_upgrade_package_id_fkey"
            columns: ["upgrade_package_id"]
            isOneToOne: false
            referencedRelation: "upgrade_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_books: {
        Row: {
          created_at: string
          description: string | null
          effective_date: string | null
          id: string
          is_default: boolean
          name: string
          source_book_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          is_default?: boolean
          name: string
          source_book_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          is_default?: boolean
          name?: string
          source_book_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_books_source_book_id_fkey"
            columns: ["source_book_id"]
            isOneToOne: false
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      counter_offers: {
        Row: {
          amount: number | null
          counter_number: number | null
          created_at: string
          date: string | null
          id: string
          notes: string | null
          offered_by: string | null
          opportunity_id: string
          status: string | null
          terms: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          counter_number?: number | null
          created_at?: string
          date?: string | null
          id?: string
          notes?: string | null
          offered_by?: string | null
          opportunity_id: string
          status?: string | null
          terms?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          counter_number?: number | null
          created_at?: string
          date?: string | null
          id?: string
          notes?: string | null
          offered_by?: string | null
          opportunity_id?: string
          status?: string | null
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counter_offers_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          entity_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string
          created_by: string | null
          crew_count: number | null
          delays: string | null
          id: string
          job_id: string
          log_date: string
          notes: string | null
          safety_incidents: string | null
          superintendent: string | null
          temperature: string | null
          updated_at: string
          weather: string | null
          work_performed: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crew_count?: number | null
          delays?: string | null
          id?: string
          job_id: string
          log_date?: string
          notes?: string | null
          safety_incidents?: string | null
          superintendent?: string | null
          temperature?: string | null
          updated_at?: string
          weather?: string | null
          work_performed?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crew_count?: number | null
          delays?: string | null
          id?: string
          job_id?: string
          log_date?: string
          notes?: string | null
          safety_incidents?: string | null
          superintendent?: string | null
          temperature?: string | null
          updated_at?: string
          weather?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_analyses: {
        Row: {
          asp: number | null
          base_build_cost: number | null
          concessions: number | null
          created_at: string
          duration_months: number | null
          id: string
          interest_rate: number | null
          ltc_ratio: number | null
          opportunity_id: string
          purchase_price: number | null
          site_work: number | null
          updated_at: string
          upgrade_package: number | null
          version: number
        }
        Insert: {
          asp?: number | null
          base_build_cost?: number | null
          concessions?: number | null
          created_at?: string
          duration_months?: number | null
          id?: string
          interest_rate?: number | null
          ltc_ratio?: number | null
          opportunity_id: string
          purchase_price?: number | null
          site_work?: number | null
          updated_at?: string
          upgrade_package?: number | null
          version?: number
        }
        Update: {
          asp?: number | null
          base_build_cost?: number | null
          concessions?: number | null
          created_at?: string
          duration_months?: number | null
          id?: string
          interest_rate?: number | null
          ltc_ratio?: number | null
          opportunity_id?: string
          purchase_price?: number | null
          site_work?: number | null
          updated_at?: string
          upgrade_package?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_analyses_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sheet_checklist: {
        Row: {
          completed: boolean
          completed_by: string | null
          completed_date: string | null
          created_at: string
          deal_sheet_id: string
          id: string
          item_name: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string
          deal_sheet_id: string
          id?: string
          item_name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string
          deal_sheet_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_sheet_checklist_deal_sheet_id_fkey"
            columns: ["deal_sheet_id"]
            isOneToOne: false
            referencedRelation: "deal_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sheet_comps: {
        Row: {
          address: string | null
          baths: number | null
          beds: number | null
          created_at: string
          deal_sheet_id: string
          id: string
          notes: string | null
          price_per_sqft: number | null
          sale_date: string | null
          sale_price: number | null
          square_footage: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          deal_sheet_id: string
          id?: string
          notes?: string | null
          price_per_sqft?: number | null
          sale_date?: string | null
          sale_price?: number | null
          square_footage?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          deal_sheet_id?: string
          id?: string
          notes?: string | null
          price_per_sqft?: number | null
          sale_date?: string | null
          sale_price?: number | null
          square_footage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_sheet_comps_deal_sheet_id_fkey"
            columns: ["deal_sheet_id"]
            isOneToOne: false
            referencedRelation: "deal_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sheet_site_work: {
        Row: {
          amount: number | null
          created_at: string
          deal_sheet_id: string
          description: string | null
          id: string
          site_work_item_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          deal_sheet_id: string
          description?: string | null
          id?: string
          site_work_item_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          deal_sheet_id?: string
          description?: string | null
          id?: string
          site_work_item_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_sheet_site_work_deal_sheet_id_fkey"
            columns: ["deal_sheet_id"]
            isOneToOne: false
            referencedRelation: "deal_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheet_site_work_site_work_item_id_fkey"
            columns: ["site_work_item_id"]
            isOneToOne: false
            referencedRelation: "site_work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sheet_upgrades: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          deal_sheet_id: string
          id: string
          included: boolean | null
          name: string | null
          sort_order: number
          updated_at: string
          upgrade_package_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          deal_sheet_id: string
          id?: string
          included?: boolean | null
          name?: string | null
          sort_order?: number
          updated_at?: string
          upgrade_package_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          deal_sheet_id?: string
          id?: string
          included?: boolean | null
          name?: string | null
          sort_order?: number
          updated_at?: string
          upgrade_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_sheet_upgrades_deal_sheet_id_fkey"
            columns: ["deal_sheet_id"]
            isOneToOne: false
            referencedRelation: "deal_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheet_upgrades_upgrade_package_id_fkey"
            columns: ["upgrade_package_id"]
            isOneToOne: false
            referencedRelation: "upgrade_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sheets: {
        Row: {
          acquisition_bonus: number | null
          acquisition_commission: number | null
          address: string | null
          asset_sales_price: number | null
          breakeven_asp: number | null
          builder_fee: number | null
          closing_costs: number | null
          contingency: number | null
          cost_book_id: string | null
          cost_of_capital: number | null
          cost_of_capital_amount: number | null
          created_at: string
          created_by: string | null
          deal_type: string | null
          entity_id: string | null
          equity_required: number | null
          floor_plan_id: string | null
          id: string
          interest_cost: number | null
          interest_rate: number | null
          is_primary: boolean | null
          is_rch_related_owner: boolean | null
          land_cost_ratio: number | null
          land_prep: number | null
          land_verdict: string | null
          loan_amount: number | null
          lot_purchase_price: number | null
          ltc_ratio: number | null
          min_asp_5pct_margin: number | null
          municipality_id: string | null
          name: string | null
          net_proceeds: number | null
          net_profit: number | null
          net_profit_margin: number | null
          opportunity_id: string | null
          other_lot_costs: number | null
          other_site_costs: number | null
          profit_verdict: string | null
          project_duration_days: number | null
          project_id: string | null
          scenario_name: string | null
          scenario_number: number | null
          sections_1_to_5: number | null
          selling_concessions: number | null
          selling_cost_rate: number | null
          selling_costs: number | null
          sensitivity_results: Json | null
          sheet_number: string | null
          site_specific: number | null
          site_work_mode: string | null
          site_work_total: number | null
          soft_costs: number | null
          status: string
          sticks_bricks: number | null
          total_all_in: number | null
          total_contract_cost: number | null
          total_fixed_per_house: number | null
          total_lot_basis: number | null
          total_project_cost: number | null
          updated_at: string
          upgrades: number | null
        }
        Insert: {
          acquisition_bonus?: number | null
          acquisition_commission?: number | null
          address?: string | null
          asset_sales_price?: number | null
          breakeven_asp?: number | null
          builder_fee?: number | null
          closing_costs?: number | null
          contingency?: number | null
          cost_book_id?: string | null
          cost_of_capital?: number | null
          cost_of_capital_amount?: number | null
          created_at?: string
          created_by?: string | null
          deal_type?: string | null
          entity_id?: string | null
          equity_required?: number | null
          floor_plan_id?: string | null
          id?: string
          interest_cost?: number | null
          interest_rate?: number | null
          is_primary?: boolean | null
          is_rch_related_owner?: boolean | null
          land_cost_ratio?: number | null
          land_prep?: number | null
          land_verdict?: string | null
          loan_amount?: number | null
          lot_purchase_price?: number | null
          ltc_ratio?: number | null
          min_asp_5pct_margin?: number | null
          municipality_id?: string | null
          name?: string | null
          net_proceeds?: number | null
          net_profit?: number | null
          net_profit_margin?: number | null
          opportunity_id?: string | null
          other_lot_costs?: number | null
          other_site_costs?: number | null
          profit_verdict?: string | null
          project_duration_days?: number | null
          project_id?: string | null
          scenario_name?: string | null
          scenario_number?: number | null
          sections_1_to_5?: number | null
          selling_concessions?: number | null
          selling_cost_rate?: number | null
          selling_costs?: number | null
          sensitivity_results?: Json | null
          sheet_number?: string | null
          site_specific?: number | null
          site_work_mode?: string | null
          site_work_total?: number | null
          soft_costs?: number | null
          status?: string
          sticks_bricks?: number | null
          total_all_in?: number | null
          total_contract_cost?: number | null
          total_fixed_per_house?: number | null
          total_lot_basis?: number | null
          total_project_cost?: number | null
          updated_at?: string
          upgrades?: number | null
        }
        Update: {
          acquisition_bonus?: number | null
          acquisition_commission?: number | null
          address?: string | null
          asset_sales_price?: number | null
          breakeven_asp?: number | null
          builder_fee?: number | null
          closing_costs?: number | null
          contingency?: number | null
          cost_book_id?: string | null
          cost_of_capital?: number | null
          cost_of_capital_amount?: number | null
          created_at?: string
          created_by?: string | null
          deal_type?: string | null
          entity_id?: string | null
          equity_required?: number | null
          floor_plan_id?: string | null
          id?: string
          interest_cost?: number | null
          interest_rate?: number | null
          is_primary?: boolean | null
          is_rch_related_owner?: boolean | null
          land_cost_ratio?: number | null
          land_prep?: number | null
          land_verdict?: string | null
          loan_amount?: number | null
          lot_purchase_price?: number | null
          ltc_ratio?: number | null
          min_asp_5pct_margin?: number | null
          municipality_id?: string | null
          name?: string | null
          net_proceeds?: number | null
          net_profit?: number | null
          net_profit_margin?: number | null
          opportunity_id?: string | null
          other_lot_costs?: number | null
          other_site_costs?: number | null
          profit_verdict?: string | null
          project_duration_days?: number | null
          project_id?: string | null
          scenario_name?: string | null
          scenario_number?: number | null
          sections_1_to_5?: number | null
          selling_concessions?: number | null
          selling_cost_rate?: number | null
          selling_costs?: number | null
          sensitivity_results?: Json | null
          sheet_number?: string | null
          site_specific?: number | null
          site_work_mode?: string | null
          site_work_total?: number | null
          soft_costs?: number | null
          status?: string
          sticks_bricks?: number | null
          total_all_in?: number | null
          total_contract_cost?: number | null
          total_fixed_per_house?: number | null
          total_lot_basis?: number | null
          total_project_cost?: number | null
          updated_at?: string
          upgrades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_sheets_cost_book_id_fkey"
            columns: ["cost_book_id"]
            isOneToOne: false
            referencedRelation: "cost_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheets_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheets_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheets_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      disposition_files: {
        Row: {
          category: string | null
          created_at: string
          disposition_id: string
          file_name: string | null
          file_size: number | null
          id: string
          storage_path: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          disposition_id: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          storage_path?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          disposition_id?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disposition_files_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      disposition_options: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          disposition_id: string
          id: string
          item_name: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          disposition_id: string
          id?: string
          item_name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          disposition_id?: string
          id?: string
          item_name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disposition_options_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositions: {
        Row: {
          actual_closed_date: string | null
          address: string | null
          appraisal_date: string | null
          appraisal_deadline: string | null
          appraisal_ordered: string | null
          appraisal_received: string | null
          appraisal_status: string | null
          appraised_value: number | null
          base_price: number | null
          buyer_address: string | null
          buyer_agent_brokerage: string | null
          buyer_agent_commission: number | null
          buyer_agent_commission_pct: number | null
          buyer_agent_email: string | null
          buyer_agent_name: string | null
          buyer_agent_phone: string | null
          buyer_credits: number | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          clear_to_close: string | null
          closed_funded: string | null
          closing_agent: string | null
          closing_costs: number | null
          closing_date: string | null
          closing_disclosure_sent: string | null
          closing_location: string | null
          closing_notes: string | null
          closing_scheduled: string | null
          closing_time: string | null
          co_buyer_email: string | null
          co_buyer_name: string | null
          contract_date: string | null
          contract_executed: string | null
          contract_price: number | null
          created_at: string
          ctc_date: string | null
          ctc_notes: string | null
          ctc_status: string | null
          customer_feedback: string | null
          down_payment_pct: number | null
          earnest_money_received: string | null
          emd_amount: number | null
          emd_held_by: string | null
          emd_received_date: string | null
          entity_id: string | null
          final_walkthrough: string | null
          financing_deadline: string | null
          financing_type: string | null
          floor_plan: string | null
          gross_sale_price: number | null
          id: string
          incentives: number | null
          inspection_deadline: string | null
          inspections_complete: string | null
          interest_rate: number | null
          job_id: string | null
          lender_name: string | null
          listed_date: string | null
          listing_agent: string | null
          listing_brokerage: string | null
          listing_commission: number | null
          listing_commission_pct: number | null
          loan_amount: number | null
          loan_approved: string | null
          loan_officer: string | null
          loan_officer_email: string | null
          loan_officer_phone: string | null
          loan_payoff: number | null
          lot_id: string | null
          lot_number: string | null
          lot_premium: number | null
          marketing_description: string | null
          mls_number: string | null
          net_proceeds: number | null
          notes: string | null
          options_total: number | null
          other_settlement_costs: number | null
          post_closing_notes: string | null
          pre_approval_amount: number | null
          pre_approval_date: string | null
          pre_approval_lender: string | null
          pre_approval_status: string | null
          project_id: string | null
          project_name: string | null
          realtor_url: string | null
          record_number: string | null
          referral_willing: string | null
          satisfaction_rating: string | null
          seller_concessions: number | null
          settlement_statement_path: string | null
          status: string
          survey_date: string | null
          title_company: string | null
          title_ordered: string | null
          updated_at: string
          virtual_tour_url: string | null
          walk_11_month_date: string | null
          walk_11_month_status: string | null
          walk_30_day_date: string | null
          walk_30_day_status: string | null
          warranty_end_1yr: string | null
          warranty_end_structural: string | null
          warranty_start_date: string | null
          wire_confirmation_path: string | null
          zillow_url: string | null
        }
        Insert: {
          actual_closed_date?: string | null
          address?: string | null
          appraisal_date?: string | null
          appraisal_deadline?: string | null
          appraisal_ordered?: string | null
          appraisal_received?: string | null
          appraisal_status?: string | null
          appraised_value?: number | null
          base_price?: number | null
          buyer_address?: string | null
          buyer_agent_brokerage?: string | null
          buyer_agent_commission?: number | null
          buyer_agent_commission_pct?: number | null
          buyer_agent_email?: string | null
          buyer_agent_name?: string | null
          buyer_agent_phone?: string | null
          buyer_credits?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          clear_to_close?: string | null
          closed_funded?: string | null
          closing_agent?: string | null
          closing_costs?: number | null
          closing_date?: string | null
          closing_disclosure_sent?: string | null
          closing_location?: string | null
          closing_notes?: string | null
          closing_scheduled?: string | null
          closing_time?: string | null
          co_buyer_email?: string | null
          co_buyer_name?: string | null
          contract_date?: string | null
          contract_executed?: string | null
          contract_price?: number | null
          created_at?: string
          ctc_date?: string | null
          ctc_notes?: string | null
          ctc_status?: string | null
          customer_feedback?: string | null
          down_payment_pct?: number | null
          earnest_money_received?: string | null
          emd_amount?: number | null
          emd_held_by?: string | null
          emd_received_date?: string | null
          entity_id?: string | null
          final_walkthrough?: string | null
          financing_deadline?: string | null
          financing_type?: string | null
          floor_plan?: string | null
          gross_sale_price?: number | null
          id?: string
          incentives?: number | null
          inspection_deadline?: string | null
          inspections_complete?: string | null
          interest_rate?: number | null
          job_id?: string | null
          lender_name?: string | null
          listed_date?: string | null
          listing_agent?: string | null
          listing_brokerage?: string | null
          listing_commission?: number | null
          listing_commission_pct?: number | null
          loan_amount?: number | null
          loan_approved?: string | null
          loan_officer?: string | null
          loan_officer_email?: string | null
          loan_officer_phone?: string | null
          loan_payoff?: number | null
          lot_id?: string | null
          lot_number?: string | null
          lot_premium?: number | null
          marketing_description?: string | null
          mls_number?: string | null
          net_proceeds?: number | null
          notes?: string | null
          options_total?: number | null
          other_settlement_costs?: number | null
          post_closing_notes?: string | null
          pre_approval_amount?: number | null
          pre_approval_date?: string | null
          pre_approval_lender?: string | null
          pre_approval_status?: string | null
          project_id?: string | null
          project_name?: string | null
          realtor_url?: string | null
          record_number?: string | null
          referral_willing?: string | null
          satisfaction_rating?: string | null
          seller_concessions?: number | null
          settlement_statement_path?: string | null
          status?: string
          survey_date?: string | null
          title_company?: string | null
          title_ordered?: string | null
          updated_at?: string
          virtual_tour_url?: string | null
          walk_11_month_date?: string | null
          walk_11_month_status?: string | null
          walk_30_day_date?: string | null
          walk_30_day_status?: string | null
          warranty_end_1yr?: string | null
          warranty_end_structural?: string | null
          warranty_start_date?: string | null
          wire_confirmation_path?: string | null
          zillow_url?: string | null
        }
        Update: {
          actual_closed_date?: string | null
          address?: string | null
          appraisal_date?: string | null
          appraisal_deadline?: string | null
          appraisal_ordered?: string | null
          appraisal_received?: string | null
          appraisal_status?: string | null
          appraised_value?: number | null
          base_price?: number | null
          buyer_address?: string | null
          buyer_agent_brokerage?: string | null
          buyer_agent_commission?: number | null
          buyer_agent_commission_pct?: number | null
          buyer_agent_email?: string | null
          buyer_agent_name?: string | null
          buyer_agent_phone?: string | null
          buyer_credits?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          clear_to_close?: string | null
          closed_funded?: string | null
          closing_agent?: string | null
          closing_costs?: number | null
          closing_date?: string | null
          closing_disclosure_sent?: string | null
          closing_location?: string | null
          closing_notes?: string | null
          closing_scheduled?: string | null
          closing_time?: string | null
          co_buyer_email?: string | null
          co_buyer_name?: string | null
          contract_date?: string | null
          contract_executed?: string | null
          contract_price?: number | null
          created_at?: string
          ctc_date?: string | null
          ctc_notes?: string | null
          ctc_status?: string | null
          customer_feedback?: string | null
          down_payment_pct?: number | null
          earnest_money_received?: string | null
          emd_amount?: number | null
          emd_held_by?: string | null
          emd_received_date?: string | null
          entity_id?: string | null
          final_walkthrough?: string | null
          financing_deadline?: string | null
          financing_type?: string | null
          floor_plan?: string | null
          gross_sale_price?: number | null
          id?: string
          incentives?: number | null
          inspection_deadline?: string | null
          inspections_complete?: string | null
          interest_rate?: number | null
          job_id?: string | null
          lender_name?: string | null
          listed_date?: string | null
          listing_agent?: string | null
          listing_brokerage?: string | null
          listing_commission?: number | null
          listing_commission_pct?: number | null
          loan_amount?: number | null
          loan_approved?: string | null
          loan_officer?: string | null
          loan_officer_email?: string | null
          loan_officer_phone?: string | null
          loan_payoff?: number | null
          lot_id?: string | null
          lot_number?: string | null
          lot_premium?: number | null
          marketing_description?: string | null
          mls_number?: string | null
          net_proceeds?: number | null
          notes?: string | null
          options_total?: number | null
          other_settlement_costs?: number | null
          post_closing_notes?: string | null
          pre_approval_amount?: number | null
          pre_approval_date?: string | null
          pre_approval_lender?: string | null
          pre_approval_status?: string | null
          project_id?: string | null
          project_name?: string | null
          realtor_url?: string | null
          record_number?: string | null
          referral_willing?: string | null
          satisfaction_rating?: string | null
          seller_concessions?: number | null
          settlement_statement_path?: string | null
          status?: string
          survey_date?: string | null
          title_company?: string | null
          title_ordered?: string | null
          updated_at?: string
          virtual_tour_url?: string | null
          walk_11_month_date?: string | null
          walk_11_month_status?: string | null
          walk_30_day_date?: string | null
          walk_30_day_status?: string | null
          warranty_end_1yr?: string | null
          warranty_end_structural?: string | null
          warranty_start_date?: string | null
          wire_confirmation_path?: string | null
          zillow_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          created_at: string
          distribution_date: string
          distribution_number: string | null
          distribution_type: string | null
          fund_id: string | null
          fund_name: string | null
          id: string
          status: string
          total_amount: number | null
          updated_at: string
          waterfall_tier: string | null
        }
        Insert: {
          created_at?: string
          distribution_date?: string
          distribution_number?: string | null
          distribution_type?: string | null
          fund_id?: string | null
          fund_name?: string | null
          id?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          waterfall_tier?: string | null
        }
        Update: {
          created_at?: string
          distribution_date?: string
          distribution_number?: string | null
          distribution_type?: string | null
          fund_id?: string | null
          fund_name?: string | null
          id?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
          waterfall_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      document_activity: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          document_id: string | null
          folder_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_activity_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_activity_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string
          entity_id: string | null
          id: string
          name: string
          parent_id: string | null
          record_id: string
          record_type: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
          record_id: string
          record_type: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          record_id?: string
          record_type?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_share_access_log: {
        Row: {
          action: string
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          referrer: string | null
          share_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          referrer?: string | null
          share_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          referrer?: string | null
          share_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_share_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_share_access_log_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "document_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      document_share_items: {
        Row: {
          document_id: string
          download_count: number | null
          id: string
          last_downloaded_at: string | null
          share_id: string
          sort_order: number | null
        }
        Insert: {
          document_id: string
          download_count?: number | null
          id?: string
          last_downloaded_at?: string | null
          share_id: string
          sort_order?: number | null
        }
        Update: {
          document_id?: string
          download_count?: number | null
          id?: string
          last_downloaded_at?: string | null
          share_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_share_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_share_items_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "document_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          access_count: number | null
          allow_download: boolean | null
          allow_upload: boolean | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          folder_id: string | null
          id: string
          include_subfolders: boolean | null
          last_accessed_at: string | null
          max_access_count: number | null
          message: string | null
          password_hash: string | null
          recipient_company: string | null
          recipient_contact_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          record_id: string
          record_type: string
          revoked_at: string | null
          revoked_by: string | null
          share_token: string
          share_type: string
          status: string | null
          subject: string | null
          total_downloads: number | null
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          allow_download?: boolean | null
          allow_upload?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          folder_id?: string | null
          id?: string
          include_subfolders?: boolean | null
          last_accessed_at?: string | null
          max_access_count?: number | null
          message?: string | null
          password_hash?: string | null
          recipient_company?: string | null
          recipient_contact_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          record_id: string
          record_type: string
          revoked_at?: string | null
          revoked_by?: string | null
          share_token?: string
          share_type: string
          status?: string | null
          subject?: string | null
          total_downloads?: number | null
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          allow_download?: boolean | null
          allow_upload?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          folder_id?: string | null
          id?: string
          include_subfolders?: boolean | null
          last_accessed_at?: string | null
          max_access_count?: number | null
          message?: string | null
          password_hash?: string | null
          recipient_company?: string | null
          recipient_contact_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          record_id?: string
          record_type?: string
          revoked_at?: string | null
          revoked_by?: string | null
          share_token?: string
          share_type?: string
          status?: string | null
          subject?: string | null
          total_downloads?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_recipient_contact_id_fkey"
            columns: ["recipient_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          record_types: string[] | null
          template: string | null
          template_html: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          record_types?: string[] | null
          template?: string | null
          template_html?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          record_types?: string[] | null
          template?: string | null
          template_html?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          generated_from_template_id: string | null
          generation_error: string | null
          generation_status: string | null
          id: string
          is_archived: boolean | null
          opportunity_id: string | null
          parent_version: string | null
          project_id: string | null
          record_id: string | null
          record_type: string | null
          storage_bucket: string | null
          storage_path: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          generated_from_template_id?: string | null
          generation_error?: string | null
          generation_status?: string | null
          id?: string
          is_archived?: boolean | null
          opportunity_id?: string | null
          parent_version?: string | null
          project_id?: string | null
          record_id?: string | null
          record_type?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          generated_from_template_id?: string | null
          generation_error?: string | null
          generation_status?: string | null
          id?: string
          is_archived?: boolean | null
          opportunity_id?: string | null
          parent_version?: string | null
          project_id?: string | null
          record_id?: string | null
          record_type?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_generated_from_template_id_fkey"
            columns: ["generated_from_template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      docuseal_config: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          entity_id: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          api_key: string
          api_url?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docuseal_config_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_requests: {
        Row: {
          amount: number | null
          created_at: string
          draw_number: number | null
          funded_date: string | null
          id: string
          notes: string | null
          project_id: string
          status: string
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          draw_number?: number | null
          funded_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          draw_number?: number | null
          funded_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      due_diligence_items: {
        Row: {
          category: string | null
          completed_date: string | null
          created_at: string
          id: string
          item_name: string
          notes: string | null
          opportunity_id: string | null
          project_id: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_date?: string | null
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_date?: string | null
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          entity_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          entity_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          entity_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          created_at: string
          entity_type: string | null
          id: string
          name: string
          record_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type?: string | null
          id?: string
          name: string
          record_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string | null
          id?: string
          name?: string
          record_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_coa_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          entity_id: string
          id: string
          template_id: string
          variables: Json
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          entity_id: string
          id?: string
          template_id: string
          variables?: Json
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          entity_id?: string
          id?: string
          template_id?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "entity_coa_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_coa_assignments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_coa_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_documents: {
        Row: {
          completed_date: string | null
          completed_document_url: string | null
          created_at: string
          docuseal_status: string | null
          docuseal_submission_id: number | null
          external_id: string | null
          field_values: Json | null
          id: string
          name: string | null
          notes: string | null
          record_id: string | null
          record_type: string | null
          sent_date: string | null
          status: string
          template_id: string | null
          updated_at: string
          voided_date: string | null
          webhook_events: Json | null
        }
        Insert: {
          completed_date?: string | null
          completed_document_url?: string | null
          created_at?: string
          docuseal_status?: string | null
          docuseal_submission_id?: number | null
          external_id?: string | null
          field_values?: Json | null
          id?: string
          name?: string | null
          notes?: string | null
          record_id?: string | null
          record_type?: string | null
          sent_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          voided_date?: string | null
          webhook_events?: Json | null
        }
        Update: {
          completed_date?: string | null
          completed_document_url?: string | null
          created_at?: string
          docuseal_status?: string | null
          docuseal_submission_id?: number | null
          external_id?: string | null
          field_values?: Json | null
          id?: string
          name?: string | null
          notes?: string | null
          record_id?: string | null
          record_type?: string | null
          sent_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          voided_date?: string | null
          webhook_events?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "esign_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "esign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_signers: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string
          docuseal_signer_id: number | null
          email: string | null
          embed_url: string | null
          id: string
          name: string | null
          role: string | null
          signed_date: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id: string
          docuseal_signer_id?: number | null
          email?: string | null
          embed_url?: string | null
          id?: string
          name?: string | null
          role?: string | null
          signed_date?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string
          docuseal_signer_id?: number | null
          email?: string | null
          embed_url?: string | null
          id?: string
          name?: string | null
          role?: string | null
          signed_date?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "esign_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "esign_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          docuseal_schema: Json | null
          docuseal_template_id: number | null
          external_id: string | null
          field_mappings: Json | null
          id: string
          last_synced_at: string | null
          name: string
          provider: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          docuseal_schema?: Json | null
          docuseal_template_id?: number | null
          external_id?: string | null
          field_mappings?: Json | null
          id?: string
          last_synced_at?: string | null
          name: string
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          docuseal_schema?: Json | null
          docuseal_template_id?: number | null
          external_id?: string | null
          field_mappings?: Json | null
          id?: string
          last_synced_at?: string | null
          name?: string
          provider?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          created_at: string
          entity_id: string | null
          estimate_number: string | null
          id: string
          project_name: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          estimate_number?: string | null
          id?: string
          project_name?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          estimate_number?: string | null
          id?: string
          project_name?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_schedule: {
        Row: {
          acquisition_fee_pct: number | null
          am_fee: number | null
          asset_mgmt_pct: number | null
          bookkeeping: number | null
          builder_fee: number | null
          builder_fee_pct: number | null
          builder_warranty: number | null
          builders_risk: number | null
          construction_mgmt_pct: number | null
          created_at: string
          development_fee_pct: number | null
          disposition_fee_pct: number | null
          entity_id: string | null
          financing_fee_flat: number | null
          id: string
          legal_fee_flat: number | null
          management_fee_pct: number | null
          pm_fee: number | null
          po_fee: number | null
          updated_at: string
          utilities: number | null
        }
        Insert: {
          acquisition_fee_pct?: number | null
          am_fee?: number | null
          asset_mgmt_pct?: number | null
          bookkeeping?: number | null
          builder_fee?: number | null
          builder_fee_pct?: number | null
          builder_warranty?: number | null
          builders_risk?: number | null
          construction_mgmt_pct?: number | null
          created_at?: string
          development_fee_pct?: number | null
          disposition_fee_pct?: number | null
          entity_id?: string | null
          financing_fee_flat?: number | null
          id?: string
          legal_fee_flat?: number | null
          management_fee_pct?: number | null
          pm_fee?: number | null
          po_fee?: number | null
          updated_at?: string
          utilities?: number | null
        }
        Update: {
          acquisition_fee_pct?: number | null
          am_fee?: number | null
          asset_mgmt_pct?: number | null
          bookkeeping?: number | null
          builder_fee?: number | null
          builder_fee_pct?: number | null
          builder_warranty?: number | null
          builders_risk?: number | null
          construction_mgmt_pct?: number | null
          created_at?: string
          development_fee_pct?: number | null
          disposition_fee_pct?: number | null
          entity_id?: string | null
          financing_fee_flat?: number | null
          id?: string
          legal_fee_flat?: number | null
          management_fee_pct?: number | null
          pm_fee?: number | null
          po_fee?: number | null
          updated_at?: string
          utilities?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_schedule_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          entity_id: string | null
          fiscal_year: number
          id: string
          period_key: string
          period_name: string
          period_number: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          entity_id?: string | null
          fiscal_year: number
          id?: string
          period_key: string
          period_name: string
          period_number: number
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          entity_id?: string | null
          fiscal_year?: number
          id?: string
          period_key?: string
          period_name?: string
          period_number?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_images: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          elevation_variant: string | null
          floor_plan_id: string
          id: string
          image_type: string
          is_primary: boolean
          storage_path: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          elevation_variant?: string | null
          floor_plan_id: string
          id?: string
          image_type?: string
          is_primary?: boolean
          storage_path: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          elevation_variant?: string | null
          floor_plan_id?: string
          id?: string
          image_type?: string
          is_primary?: boolean
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_images_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          base_construction_cost: number | null
          base_price: number | null
          base_sale_price: number | null
          bath_count: number | null
          bed_count: number | null
          contract_snb: number | null
          contract_total: number | null
          cost_per_sf: number | null
          created_at: string
          depth_ft: number | null
          dm_budget_snb: number | null
          dm_budget_total: number | null
          elevation: string | null
          floorplan_url: string | null
          garage_bays: number | null
          garage_type: string | null
          heated_sqft: number | null
          id: string
          name: string | null
          plan_name: string | null
          plan_type: string | null
          project_id: string | null
          rendering_url: string | null
          square_footage: number | null
          status: string
          stories: number | null
          total_sqft: number | null
          updated_at: string
          width_ft: number | null
        }
        Insert: {
          base_construction_cost?: number | null
          base_price?: number | null
          base_sale_price?: number | null
          bath_count?: number | null
          bed_count?: number | null
          contract_snb?: number | null
          contract_total?: number | null
          cost_per_sf?: number | null
          created_at?: string
          depth_ft?: number | null
          dm_budget_snb?: number | null
          dm_budget_total?: number | null
          elevation?: string | null
          floorplan_url?: string | null
          garage_bays?: number | null
          garage_type?: string | null
          heated_sqft?: number | null
          id?: string
          name?: string | null
          plan_name?: string | null
          plan_type?: string | null
          project_id?: string | null
          rendering_url?: string | null
          square_footage?: number | null
          status?: string
          stories?: number | null
          total_sqft?: number | null
          updated_at?: string
          width_ft?: number | null
        }
        Update: {
          base_construction_cost?: number | null
          base_price?: number | null
          base_sale_price?: number | null
          bath_count?: number | null
          bed_count?: number | null
          contract_snb?: number | null
          contract_total?: number | null
          cost_per_sf?: number | null
          created_at?: string
          depth_ft?: number | null
          dm_budget_snb?: number | null
          dm_budget_total?: number | null
          elevation?: string | null
          floorplan_url?: string | null
          garage_bays?: number | null
          garage_type?: string | null
          heated_sqft?: number | null
          id?: string
          name?: string | null
          plan_name?: string | null
          plan_type?: string | null
          project_id?: string | null
          rendering_url?: string | null
          square_footage?: number | null
          status?: string
          stories?: number | null
          total_sqft?: number | null
          updated_at?: string
          width_ft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_template_items: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_template_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folder_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "folder_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_templates: {
        Row: {
          created_at: string
          description: string | null
          entity_type: string
          id: string
          is_default: boolean
          name: string
          project_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_type: string
          id?: string
          is_default?: boolean
          name: string
          project_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_type?: string
          id?: string
          is_default?: boolean
          name?: string
          project_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      funds: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          fund_type: string | null
          id: string
          name: string
          preferred_return: number | null
          promote_structure: string | null
          status: string
          total_called: number | null
          total_committed: number | null
          total_deployed: number | null
          total_distributed: number | null
          updated_at: string
          vintage_year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          fund_type?: string | null
          id?: string
          name: string
          preferred_return?: number | null
          promote_structure?: string | null
          status?: string
          total_called?: number | null
          total_committed?: number | null
          total_deployed?: number | null
          total_distributed?: number | null
          updated_at?: string
          vintage_year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          fund_type?: string | null
          id?: string
          name?: string
          preferred_return?: number | null
          promote_structure?: string | null
          status?: string
          total_called?: number | null
          total_committed?: number | null
          total_deployed?: number | null
          total_distributed?: number | null
          updated_at?: string
          vintage_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      handoff_checklist_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_name: string
          required: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_name: string
          required?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string
          required?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      horizontal_line_items: {
        Row: {
          actual_cost: number | null
          category: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          project_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          project_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          project_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horizontal_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          inspection_type: string | null
          inspector: string | null
          job_id: string
          notes: string | null
          result: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string | null
          inspector?: string | null
          job_id: string
          notes?: string | null
          result?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string | null
          inspector?: string | null
          job_id?: string
          notes?: string | null
          result?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_certificates: {
        Row: {
          coverage_amount: number | null
          created_at: string
          expiration_date: string | null
          id: string
          insurer: string | null
          policy_number: string | null
          policy_type: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          coverage_amount?: number | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          insurer?: string | null
          policy_number?: string | null
          policy_type?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          coverage_amount?: number | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          insurer?: string | null
          policy_number?: string | null
          policy_type?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          called_amount: number | null
          commitment_amount: number | null
          created_at: string
          distributed_amount: number | null
          distributions_received: number | null
          fund_id: string
          id: string
          investor_name: string | null
          ownership_pct: number | null
          status: string
          updated_at: string
        }
        Insert: {
          called_amount?: number | null
          commitment_amount?: number | null
          created_at?: string
          distributed_amount?: number | null
          distributions_received?: number | null
          fund_id: string
          id?: string
          investor_name?: string | null
          ownership_pct?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          called_amount?: number | null
          commitment_amount?: number | null
          created_at?: string
          distributed_amount?: number | null
          distributions_received?: number | null
          fund_id?: string
          id?: string
          investor_name?: string | null
          ownership_pct?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number: string | null
          amount: number
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          invoice_id: string
          line_number: number
          quantity: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          account_number?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          invoice_id: string
          line_number?: number
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          account_number?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          invoice_id?: string
          line_number?: number
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          created_at: string
          customer_name: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          paid_amount: number | null
          project_id: string | null
          status: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          paid_amount?: number | null
          project_id?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          paid_amount?: number | null
          project_id?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_budget_lines: {
        Row: {
          budgeted: number | null
          committed: number | null
          cost_code: string | null
          created_at: string
          description: string | null
          id: string
          invoiced: number | null
          job_id: string
          paid: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          budgeted?: number | null
          committed?: number | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoiced?: number | null
          job_id: string
          paid?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          budgeted?: number | null
          committed?: number | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoiced?: number | null
          job_id?: string
          paid?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_budget_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_files: {
        Row: {
          category: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          job_id: string
          storage_path: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          job_id: string
          storage_path?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          job_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_handoff_items: {
        Row: {
          checklist_item_id: string | null
          completed: boolean
          completed_by: string | null
          completed_date: string | null
          created_at: string
          handoff_id: string
          id: string
          item_name: string | null
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          checklist_item_id?: string | null
          completed?: boolean
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string
          handoff_id: string
          id?: string
          item_name?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          checklist_item_id?: string | null
          completed?: boolean
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string
          handoff_id?: string
          id?: string
          item_name?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_handoff_items_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "handoff_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_handoff_items_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "job_handoffs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_handoffs: {
        Row: {
          created_at: string
          digital_package: boolean | null
          handoff_date: string | null
          handoff_day: string | null
          id: string
          job_id: string
          notes: string | null
          physical_package: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          digital_package?: boolean | null
          handoff_date?: string | null
          handoff_day?: string | null
          id?: string
          job_id: string
          notes?: string | null
          physical_package?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          digital_package?: boolean | null
          handoff_date?: string | null
          handoff_day?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          physical_package?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_handoffs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_milestones: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          job_id: string
          name: string
          sort_order: number
          started_date: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          job_id: string
          name: string
          sort_order?: number
          started_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          job_id?: string
          name?: string
          sort_order?: number
          started_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string | null
          id: string
          job_id: string
          storage_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          job_id: string
          storage_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          job_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_completion: string | null
          budget_total: number | null
          build_duration: number | null
          builder: string | null
          contract_amount: number | null
          created_at: string
          entity_id: string | null
          floor_plan_id: string | null
          floor_plan_name: string | null
          id: string
          job_name: string | null
          lot_id: string | null
          lot_number: string | null
          notes: string | null
          project_id: string | null
          project_name: string | null
          record_number: string | null
          spent_total: number | null
          start_date: string | null
          status: string
          target_completion: string | null
          updated_at: string
        }
        Insert: {
          actual_completion?: string | null
          budget_total?: number | null
          build_duration?: number | null
          builder?: string | null
          contract_amount?: number | null
          created_at?: string
          entity_id?: string | null
          floor_plan_id?: string | null
          floor_plan_name?: string | null
          id?: string
          job_name?: string | null
          lot_id?: string | null
          lot_number?: string | null
          notes?: string | null
          project_id?: string | null
          project_name?: string | null
          record_number?: string | null
          spent_total?: number | null
          start_date?: string | null
          status?: string
          target_completion?: string | null
          updated_at?: string
        }
        Update: {
          actual_completion?: string | null
          budget_total?: number | null
          build_duration?: number | null
          builder?: string | null
          contract_amount?: number | null
          created_at?: string
          entity_id?: string | null
          floor_plan_id?: string | null
          floor_plan_name?: string | null
          id?: string
          job_name?: string | null
          lot_id?: string | null
          lot_number?: string | null
          notes?: string | null
          project_id?: string | null
          project_name?: string | null
          record_number?: string | null
          spent_total?: number | null
          start_date?: string | null
          status?: string
          target_completion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entry_date: string
          entry_number: string | null
          id: string
          reversal_of_id: string | null
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entry_date?: string
          entry_number?: string | null
          id?: string
          reversal_of_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entry_date?: string
          entry_number?: string | null
          id?: string
          reversal_of_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entity_id: string | null
          id: string
          is_reconciled: boolean | null
          journal_entry_id: string
          reconciled_date: string | null
          reconciliation_id: string | null
          reference: string | null
          running_balance: number | null
          transaction_date: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          journal_entry_id: string
          reconciled_date?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          running_balance?: number | null
          transaction_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          journal_entry_id?: string
          reconciled_date?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          running_balance?: number | null
          transaction_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          caption: string | null
          created_at: string
          disposition_id: string
          file_name: string | null
          id: string
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          disposition_id: string
          file_name?: string | null
          id?: string
          sort_order?: number
          storage_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          disposition_id?: string
          file_name?: string | null
          id?: string
          sort_order?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_takedowns: {
        Row: {
          created_at: string
          id: string
          lot_count: number | null
          project_id: string
          purchase_price: number | null
          scheduled_date: string | null
          status: string
          tranche_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot_count?: number | null
          project_id: string
          purchase_price?: number | null
          scheduled_date?: string | null
          status?: string
          tranche_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lot_count?: number | null
          project_id?: string
          purchase_price?: number | null
          scheduled_date?: string | null
          status?: string
          tranche_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_takedowns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          base_price: number | null
          created_at: string
          floor_plan_name: string | null
          id: string
          job_id: string | null
          lot_number: string | null
          lot_premium: number | null
          project_id: string
          record_number: string | null
          square_footage: number | null
          status: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          floor_plan_name?: string | null
          id?: string
          job_id?: string | null
          lot_number?: string | null
          lot_premium?: number | null
          project_id: string
          record_number?: string | null
          square_footage?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          floor_plan_name?: string | null
          id?: string
          job_id?: string | null
          lot_number?: string | null
          lot_premium?: number | null
          project_id?: string
          record_number?: string | null
          square_footage?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          matter_id: string
          notes: string | null
          role: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          matter_id: string
          notes?: string | null
          role: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          matter_id?: string
          notes?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_contacts_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          matter_id: string
          mime_type: string | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          matter_id: string
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          matter_id?: string
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_documents_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_linked_records: {
        Row: {
          created_at: string
          id: string
          matter_id: string
          record_id: string
          record_type: string
          relationship_description: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          matter_id: string
          record_id: string
          record_type: string
          relationship_description?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          matter_id?: string
          record_id?: string
          record_type?: string
          relationship_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_linked_records_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_notes: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          matter_id: string
          new_value: string | null
          note_type: string
          previous_value: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matter_id: string
          new_value?: string | null
          note_type?: string
          previous_value?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matter_id?: string
          new_value?: string | null
          note_type?: string
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_notes_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_workflow_steps: {
        Row: {
          ai_generated: boolean
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          depends_on: string[] | null
          description: string | null
          due_date: string | null
          id: string
          matter_id: string
          parent_step_id: string | null
          status: string
          step_order: number
          step_type: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          matter_id: string
          parent_step_id?: string | null
          status?: string
          step_order: number
          step_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          matter_id?: string
          parent_step_id?: string | null
          status?: string
          step_order?: number
          step_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_workflow_steps_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_workflow_steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "matter_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      matters: {
        Row: {
          ai_generated_workflow: Json | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          created_by: string
          goals_and_deliverables: string | null
          id: string
          intake_conversation: Json | null
          linked_entity_id: string | null
          linked_opportunity_id: string | null
          linked_project_id: string | null
          matter_number: string
          priority: string
          relevant_information: string | null
          resolved_at: string | null
          situation_summary: string | null
          status: string
          target_completion_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated_workflow?: Json | null
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          goals_and_deliverables?: string | null
          id?: string
          intake_conversation?: Json | null
          linked_entity_id?: string | null
          linked_opportunity_id?: string | null
          linked_project_id?: string | null
          matter_number: string
          priority?: string
          relevant_information?: string | null
          resolved_at?: string | null
          situation_summary?: string | null
          status?: string
          target_completion_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated_workflow?: Json | null
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          goals_and_deliverables?: string | null
          id?: string
          intake_conversation?: Json | null
          linked_entity_id?: string | null
          linked_opportunity_id?: string | null
          linked_project_id?: string | null
          matter_number?: string
          priority?: string
          relevant_information?: string | null
          resolved_at?: string | null
          situation_summary?: string | null
          status?: string
          target_completion_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matters_linked_entity_id_fkey"
            columns: ["linked_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_linked_opportunity_id_fkey"
            columns: ["linked_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          started_date: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
          started_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          started_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          architect: number | null
          county: string | null
          created_at: string
          engineering: number | null
          gas_tap: number | null
          id: string
          impact: number | null
          name: string
          notes: string | null
          permitting: number | null
          sewer_tap: number | null
          state: string | null
          survey: number | null
          updated_at: string
          verified_by: string | null
          verified_date: string | null
          water_tap: number | null
        }
        Insert: {
          architect?: number | null
          county?: string | null
          created_at?: string
          engineering?: number | null
          gas_tap?: number | null
          id?: string
          impact?: number | null
          name: string
          notes?: string | null
          permitting?: number | null
          sewer_tap?: number | null
          state?: string | null
          survey?: number | null
          updated_at?: string
          verified_by?: string | null
          verified_date?: string | null
          water_tap?: number | null
        }
        Update: {
          architect?: number | null
          county?: string | null
          created_at?: string
          engineering?: number | null
          gas_tap?: number | null
          id?: string
          impact?: number | null
          name?: string
          notes?: string | null
          permitting?: number | null
          sewer_tap?: number | null
          state?: string | null
          survey?: number | null
          updated_at?: string
          verified_by?: string | null
          verified_date?: string | null
          water_tap?: number | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          buyer_name: string | null
          contingencies: string | null
          created_at: string
          disposition_id: string
          earnest_money: number | null
          id: string
          notes: string | null
          offer_amount: number | null
          offer_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_name?: string | null
          contingencies?: string | null
          created_at?: string
          disposition_id: string
          earnest_money?: number | null
          id?: string
          notes?: string | null
          offer_amount?: number | null
          offer_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_name?: string | null
          contingencies?: string | null
          created_at?: string
          disposition_id?: string
          earnest_money?: number | null
          id?: string
          notes?: string | null
          offer_amount?: number | null
          offer_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          acreage: number | null
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          assigned_to: string | null
          buy_box_max_land_ratio: number | null
          buy_box_max_price: number | null
          buy_box_min_margin: number | null
          buy_box_min_sqft: number | null
          buy_box_pass: boolean | null
          closing_date: string | null
          contract_price: number | null
          county: string | null
          created_at: string
          dd_period_end: string | null
          description: string | null
          earnest_money: number | null
          effective_date: string | null
          electric_status: string | null
          entitlement_risk: string | null
          entity_id: string | null
          estimated_value: number | null
          execution_risk: string | null
          financing_type: string | null
          flood_zone: string | null
          gas_status: string | null
          hoa_required: string | null
          id: string
          infrastructure_budget: number | null
          interest_rate: number | null
          land_committee_date: string | null
          land_committee_notes: string | null
          land_committee_status: string | null
          loan_term_months: number | null
          lot_dimensions: string | null
          lot_price: number | null
          ltc_ratio: number | null
          market_risk: string | null
          municipality_id: string | null
          num_phases: number | null
          offer_amount: number | null
          offer_date: string | null
          offer_status: string | null
          opportunity_name: string
          overall_risk: string | null
          parcel_id: string | null
          priority: string | null
          probability: number | null
          project_id: string | null
          project_type: string | null
          record_number: string | null
          sewer_status: string | null
          source: string | null
          special_conditions: string | null
          status: string
          target_annualized_roi: number | null
          target_gross_margin: number | null
          target_net_margin: number | null
          target_roi: number | null
          topography: string | null
          total_lots: number | null
          underwriting_notes: string | null
          updated_at: string
          water_status: string | null
          zoning: string | null
        }
        Insert: {
          acreage?: number | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          assigned_to?: string | null
          buy_box_max_land_ratio?: number | null
          buy_box_max_price?: number | null
          buy_box_min_margin?: number | null
          buy_box_min_sqft?: number | null
          buy_box_pass?: boolean | null
          closing_date?: string | null
          contract_price?: number | null
          county?: string | null
          created_at?: string
          dd_period_end?: string | null
          description?: string | null
          earnest_money?: number | null
          effective_date?: string | null
          electric_status?: string | null
          entitlement_risk?: string | null
          entity_id?: string | null
          estimated_value?: number | null
          execution_risk?: string | null
          financing_type?: string | null
          flood_zone?: string | null
          gas_status?: string | null
          hoa_required?: string | null
          id?: string
          infrastructure_budget?: number | null
          interest_rate?: number | null
          land_committee_date?: string | null
          land_committee_notes?: string | null
          land_committee_status?: string | null
          loan_term_months?: number | null
          lot_dimensions?: string | null
          lot_price?: number | null
          ltc_ratio?: number | null
          market_risk?: string | null
          municipality_id?: string | null
          num_phases?: number | null
          offer_amount?: number | null
          offer_date?: string | null
          offer_status?: string | null
          opportunity_name: string
          overall_risk?: string | null
          parcel_id?: string | null
          priority?: string | null
          probability?: number | null
          project_id?: string | null
          project_type?: string | null
          record_number?: string | null
          sewer_status?: string | null
          source?: string | null
          special_conditions?: string | null
          status?: string
          target_annualized_roi?: number | null
          target_gross_margin?: number | null
          target_net_margin?: number | null
          target_roi?: number | null
          topography?: string | null
          total_lots?: number | null
          underwriting_notes?: string | null
          updated_at?: string
          water_status?: string | null
          zoning?: string | null
        }
        Update: {
          acreage?: number | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          assigned_to?: string | null
          buy_box_max_land_ratio?: number | null
          buy_box_max_price?: number | null
          buy_box_min_margin?: number | null
          buy_box_min_sqft?: number | null
          buy_box_pass?: boolean | null
          closing_date?: string | null
          contract_price?: number | null
          county?: string | null
          created_at?: string
          dd_period_end?: string | null
          description?: string | null
          earnest_money?: number | null
          effective_date?: string | null
          electric_status?: string | null
          entitlement_risk?: string | null
          entity_id?: string | null
          estimated_value?: number | null
          execution_risk?: string | null
          financing_type?: string | null
          flood_zone?: string | null
          gas_status?: string | null
          hoa_required?: string | null
          id?: string
          infrastructure_budget?: number | null
          interest_rate?: number | null
          land_committee_date?: string | null
          land_committee_notes?: string | null
          land_committee_status?: string | null
          loan_term_months?: number | null
          lot_dimensions?: string | null
          lot_price?: number | null
          ltc_ratio?: number | null
          market_risk?: string | null
          municipality_id?: string | null
          num_phases?: number | null
          offer_amount?: number | null
          offer_date?: string | null
          offer_status?: string | null
          opportunity_name?: string
          overall_risk?: string | null
          parcel_id?: string | null
          priority?: string | null
          probability?: number | null
          project_id?: string | null
          project_type?: string | null
          record_number?: string | null
          sewer_status?: string | null
          source?: string | null
          special_conditions?: string | null
          status?: string
          target_annualized_roi?: number | null
          target_gross_margin?: number | null
          target_net_margin?: number | null
          target_roi?: number | null
          topography?: string | null
          total_lots?: number | null
          underwriting_notes?: string | null
          updated_at?: string
          water_status?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          template: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          template?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          template?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      parcels: {
        Row: {
          acreage: number | null
          address: string | null
          apn: string | null
          created_at: string
          id: string
          opportunity_id: string | null
          parcel_number: string | null
          project_id: string | null
          updated_at: string
          zoning: string | null
        }
        Insert: {
          acreage?: number | null
          address?: string | null
          apn?: string | null
          created_at?: string
          id?: string
          opportunity_id?: string | null
          parcel_number?: string | null
          project_id?: string | null
          updated_at?: string
          zoning?: string | null
        }
        Update: {
          acreage?: number | null
          address?: string | null
          apn?: string | null
          created_at?: string
          id?: string
          opportunity_id?: string | null
          parcel_number?: string | null
          project_id?: string | null
          updated_at?: string
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcels_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          amount: number
          bank_account_id: string | null
          batch_payment_id: string | null
          bill_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string
          receivable_id: string | null
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          batch_payment_id?: string | null
          bill_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type: string
          receivable_id?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          batch_payment_id?: string | null
          bill_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          receivable_id?: string | null
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_batch_payment_id_fkey"
            columns: ["batch_payment_id"]
            isOneToOne: false
            referencedRelation: "batch_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      period_close: {
        Row: {
          accrue_expenses: string | null
          created_at: string
          entity_id: string | null
          generate_financial_statements: string | null
          id: string
          lock_period: string | null
          management_review: string | null
          period: string
          recognize_revenue: string | null
          reconcile_bank_accounts: string | null
          review_ap_aging: string | null
          review_ar_aging: string | null
          review_intercompany: string | null
          review_unposted_je: string | null
          review_variance: string | null
          run_trial_balance: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accrue_expenses?: string | null
          created_at?: string
          entity_id?: string | null
          generate_financial_statements?: string | null
          id?: string
          lock_period?: string | null
          management_review?: string | null
          period: string
          recognize_revenue?: string | null
          reconcile_bank_accounts?: string | null
          review_ap_aging?: string | null
          review_ar_aging?: string | null
          review_intercompany?: string | null
          review_unposted_je?: string | null
          review_variance?: string | null
          run_trial_balance?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accrue_expenses?: string | null
          created_at?: string
          entity_id?: string | null
          generate_financial_statements?: string | null
          id?: string
          lock_period?: string | null
          management_review?: string | null
          period?: string
          recognize_revenue?: string | null
          reconcile_bank_accounts?: string | null
          review_ap_aging?: string | null
          review_ar_aging?: string | null
          review_intercompany?: string | null
          review_unposted_je?: string | null
          review_variance?: string | null
          run_trial_balance?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_close_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      permits: {
        Row: {
          applied_date: string | null
          created_at: string
          fee: number | null
          id: string
          issued_date: string | null
          job_id: string
          jurisdiction: string | null
          permit_number: string | null
          permit_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_date?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          issued_date?: string | null
          job_id: string
          jurisdiction?: string | null
          permit_number?: string | null
          permit_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_date?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          issued_date?: string | null
          job_id?: string
          jurisdiction?: string | null
          permit_number?: string | null
          permit_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_defaults: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      pricing_exclusions: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      project_components: {
        Row: {
          component_type: string | null
          created_at: string
          description: string | null
          id: string
          name: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          component_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          component_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_elevation_options: {
        Row: {
          created_at: string
          description: string | null
          elevation_name: string | null
          id: string
          plan_catalog_id: string
          price_adjustment: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          elevation_name?: string | null
          id?: string
          plan_catalog_id: string
          price_adjustment?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          elevation_name?: string | null
          id?: string
          plan_catalog_id?: string
          price_adjustment?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_elevation_options_plan_catalog_id_fkey"
            columns: ["plan_catalog_id"]
            isOneToOne: false
            referencedRelation: "project_plan_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      project_investors: {
        Row: {
          created_at: string
          distributions_paid: number | null
          id: string
          investment_amount: number | null
          investor_name: string | null
          ownership_pct: number | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributions_paid?: number | null
          id?: string
          investment_amount?: number | null
          investor_name?: string | null
          ownership_pct?: number | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributions_paid?: number | null
          id?: string
          investment_amount?: number | null
          investor_name?: string | null
          ownership_pct?: number | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_investors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_plan_catalog: {
        Row: {
          base_price: number | null
          created_at: string
          floor_plan_id: string | null
          id: string
          lot_count: number | null
          plan_name: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          floor_plan_id?: string | null
          id?: string
          lot_count?: number | null
          plan_name?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          floor_plan_id?: string | null
          id?: string
          lot_count?: number | null
          plan_name?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_plan_catalog_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_upgrade_catalog: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          id: string
          included_by_default: boolean | null
          name: string | null
          project_id: string
          sort_order: number
          updated_at: string
          upgrade_package_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          id?: string
          included_by_default?: boolean | null
          name?: string | null
          project_id: string
          sort_order?: number
          updated_at?: string
          upgrade_package_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          id?: string
          included_by_default?: boolean | null
          name?: string | null
          project_id?: string
          sort_order?: number
          updated_at?: string
          upgrade_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_upgrade_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_upgrade_catalog_upgrade_package_id_fkey"
            columns: ["upgrade_package_id"]
            isOneToOne: false
            referencedRelation: "upgrade_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          county: string | null
          created_at: string
          description: string | null
          entitlement_notes: string | null
          entity_id: string | null
          entity_name: string | null
          equity_invested: number | null
          grading_status: string | null
          hoa_fee: number | null
          hoa_name: string | null
          id: string
          lender_name: string | null
          loan_amount: number | null
          loan_balance: number | null
          loan_maturity_date: string | null
          loan_notes: string | null
          loan_number: string | null
          loan_officer: string | null
          loan_origination_date: string | null
          loan_rate: number | null
          loan_type: string | null
          max_height: string | null
          opportunity_id: string | null
          phases: number | null
          plat_recording_date: string | null
          plat_status: string | null
          project_name: string
          project_type: string | null
          record_number: string | null
          rezoning_required: string | null
          setback_front: string | null
          setback_rear: string | null
          setback_side: string | null
          site_plan_date: string | null
          site_plan_status: string | null
          status: string
          stormwater_status: string | null
          total_acreage: number | null
          total_budget: number | null
          total_lots: number | null
          total_profit: number | null
          total_revenue: number | null
          total_spent: number | null
          updated_at: string
          utility_electric: string | null
          utility_gas: string | null
          utility_sewer: string | null
          utility_water: string | null
          zoning: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          entitlement_notes?: string | null
          entity_id?: string | null
          entity_name?: string | null
          equity_invested?: number | null
          grading_status?: string | null
          hoa_fee?: number | null
          hoa_name?: string | null
          id?: string
          lender_name?: string | null
          loan_amount?: number | null
          loan_balance?: number | null
          loan_maturity_date?: string | null
          loan_notes?: string | null
          loan_number?: string | null
          loan_officer?: string | null
          loan_origination_date?: string | null
          loan_rate?: number | null
          loan_type?: string | null
          max_height?: string | null
          opportunity_id?: string | null
          phases?: number | null
          plat_recording_date?: string | null
          plat_status?: string | null
          project_name: string
          project_type?: string | null
          record_number?: string | null
          rezoning_required?: string | null
          setback_front?: string | null
          setback_rear?: string | null
          setback_side?: string | null
          site_plan_date?: string | null
          site_plan_status?: string | null
          status?: string
          stormwater_status?: string | null
          total_acreage?: number | null
          total_budget?: number | null
          total_lots?: number | null
          total_profit?: number | null
          total_revenue?: number | null
          total_spent?: number | null
          updated_at?: string
          utility_electric?: string | null
          utility_gas?: string | null
          utility_sewer?: string | null
          utility_water?: string | null
          zoning?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          entitlement_notes?: string | null
          entity_id?: string | null
          entity_name?: string | null
          equity_invested?: number | null
          grading_status?: string | null
          hoa_fee?: number | null
          hoa_name?: string | null
          id?: string
          lender_name?: string | null
          loan_amount?: number | null
          loan_balance?: number | null
          loan_maturity_date?: string | null
          loan_notes?: string | null
          loan_number?: string | null
          loan_officer?: string | null
          loan_origination_date?: string | null
          loan_rate?: number | null
          loan_type?: string | null
          max_height?: string | null
          opportunity_id?: string | null
          phases?: number | null
          plat_recording_date?: string | null
          plat_status?: string | null
          project_name?: string
          project_type?: string | null
          record_number?: string | null
          rezoning_required?: string | null
          setback_front?: string | null
          setback_rear?: string | null
          setback_side?: string | null
          site_plan_date?: string | null
          site_plan_status?: string | null
          status?: string
          stormwater_status?: string | null
          total_acreage?: number | null
          total_budget?: number | null
          total_lots?: number | null
          total_profit?: number | null
          total_revenue?: number | null
          total_spent?: number | null
          updated_at?: string
          utility_electric?: string | null
          utility_gas?: string | null
          utility_sewer?: string | null
          utility_water?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          amount: number | null
          cost_code: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          issue_date: string | null
          issued_date: string | null
          job_id: string | null
          po_number: string | null
          status: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          issue_date?: string | null
          issued_date?: string | null
          job_id?: string | null
          po_number?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          cost_code?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          issue_date?: string | null
          issued_date?: string | null
          job_id?: string | null
          po_number?: string | null
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rch_contract_draws: {
        Row: {
          amount: number | null
          approved_date: string | null
          contract_id: string
          created_at: string
          draw_number: number | null
          funded_date: string | null
          id: string
          notes: string | null
          status: string
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          approved_date?: string | null
          contract_id: string
          created_at?: string
          draw_number?: number | null
          funded_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          approved_date?: string | null
          contract_id?: string
          created_at?: string
          draw_number?: number | null
          funded_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          submitted_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rch_contract_draws_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rch_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      rch_contract_units: {
        Row: {
          contract_id: string
          created_at: string
          elevation: string | null
          fixed_per_house: number | null
          floor_plan_id: string | null
          id: string
          lot_condition_cm: string | null
          lot_condition_date: string | null
          lot_condition_notes: string | null
          lot_id: string | null
          lot_number: string | null
          phase: string | null
          plan_name: string | null
          section_1_sticks: number | null
          section_2_upgrades: number | null
          section_3_soft: number | null
          section_4_land_prep: number | null
          section_5_site: number | null
          section_6_builder_fee: number | null
          section_7_contingency: number | null
          site_specific_cost: number | null
          sort_order: number
          sterling_amount: number | null
          sterling_received: boolean | null
          sterling_requested: boolean | null
          sterling_status: string | null
          unit_total: number | null
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          elevation?: string | null
          fixed_per_house?: number | null
          floor_plan_id?: string | null
          id?: string
          lot_condition_cm?: string | null
          lot_condition_date?: string | null
          lot_condition_notes?: string | null
          lot_id?: string | null
          lot_number?: string | null
          phase?: string | null
          plan_name?: string | null
          section_1_sticks?: number | null
          section_2_upgrades?: number | null
          section_3_soft?: number | null
          section_4_land_prep?: number | null
          section_5_site?: number | null
          section_6_builder_fee?: number | null
          section_7_contingency?: number | null
          site_specific_cost?: number | null
          sort_order?: number
          sterling_amount?: number | null
          sterling_received?: boolean | null
          sterling_requested?: boolean | null
          sterling_status?: string | null
          unit_total?: number | null
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          elevation?: string | null
          fixed_per_house?: number | null
          floor_plan_id?: string | null
          id?: string
          lot_condition_cm?: string | null
          lot_condition_date?: string | null
          lot_condition_notes?: string | null
          lot_id?: string | null
          lot_number?: string | null
          phase?: string | null
          plan_name?: string | null
          section_1_sticks?: number | null
          section_2_upgrades?: number | null
          section_3_soft?: number | null
          section_4_land_prep?: number | null
          section_5_site?: number | null
          section_6_builder_fee?: number | null
          section_7_contingency?: number | null
          site_specific_cost?: number | null
          sort_order?: number
          sterling_amount?: number | null
          sterling_received?: boolean | null
          sterling_requested?: boolean | null
          sterling_status?: string | null
          unit_total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rch_contract_units_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rch_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rch_contract_units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rch_contract_units_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      rch_contracts: {
        Row: {
          client_name: string | null
          completion_date: string | null
          contract_amount: number | null
          contract_number: string | null
          contract_type: string | null
          created_at: string
          effective_date: string | null
          id: string
          notes: string | null
          owner_entity_id: string | null
          project_id: string | null
          record_number: string | null
          status: string
          unit_count: number | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          completion_date?: string | null
          contract_amount?: number | null
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string
          effective_date?: string | null
          id?: string
          notes?: string | null
          owner_entity_id?: string | null
          project_id?: string | null
          record_number?: string | null
          status?: string
          unit_count?: number | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          completion_date?: string | null
          contract_amount?: number | null
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string
          effective_date?: string | null
          id?: string
          notes?: string | null
          owner_entity_id?: string | null
          project_id?: string | null
          record_number?: string | null
          status?: string
          unit_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rch_contracts_owner_entity_id_fkey"
            columns: ["owner_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rch_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number | null
          created_at: string
          customer_name: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          id: string
          invoice_date: string | null
          project_name: string | null
          receivable_number: string | null
          receivable_type: string | null
          received_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          invoice_date?: string | null
          project_name?: string | null
          receivable_number?: string | null
          receivable_type?: string | null
          received_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          invoice_date?: string | null
          project_name?: string | null
          receivable_number?: string | null
          receivable_type?: string | null
          received_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          bank_account_id: string | null
          bank_account_name: string | null
          book_balance: number | null
          created_at: string
          difference: number | null
          entity_id: string | null
          id: string
          month: string | null
          statement_balance: number | null
          status: string
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          bank_account_name?: string | null
          book_balance?: number | null
          created_at?: string
          difference?: number | null
          entity_id?: string | null
          id?: string
          month?: string | null
          statement_balance?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          bank_account_name?: string | null
          book_balance?: number | null
          created_at?: string
          difference?: number | null
          entity_id?: string | null
          id?: string
          month?: string | null
          statement_balance?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      record_teams: {
        Row: {
          assignment_role: string
          created_at: string
          id: string
          record_id: string
          record_type: string
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assignment_role?: string
          created_at?: string
          id?: string
          record_id: string
          record_type: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assignment_role?: string
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "record_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      selections: {
        Row: {
          actual_cost: number | null
          allowance: number | null
          amount: number | null
          approved_date: string | null
          category: string | null
          created_at: string
          id: string
          item_name: string | null
          job_id: string
          notes: string | null
          selected_option: string | null
          selection_made: string | null
          status: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          actual_cost?: number | null
          allowance?: number | null
          amount?: number | null
          approved_date?: string | null
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string | null
          job_id: string
          notes?: string | null
          selected_option?: string | null
          selection_made?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          actual_cost?: number | null
          allowance?: number | null
          amount?: number | null
          approved_date?: string | null
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string | null
          job_id?: string
          notes?: string | null
          selected_option?: string | null
          selection_made?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      showings: {
        Row: {
          agent_name: string | null
          created_at: string
          disposition_id: string
          feedback: string | null
          id: string
          result: string | null
          showing_date: string | null
          updated_at: string
        }
        Insert: {
          agent_name?: string | null
          created_at?: string
          disposition_id: string
          feedback?: string | null
          id?: string
          result?: string | null
          showing_date?: string | null
          updated_at?: string
        }
        Update: {
          agent_name?: string | null
          created_at?: string
          disposition_id?: string
          feedback?: string | null
          id?: string
          result?: string | null
          showing_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showings_disposition_id_fkey"
            columns: ["disposition_id"]
            isOneToOne: false
            referencedRelation: "dispositions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_work_items: {
        Row: {
          code: string
          created_at: string
          default_amount: number | null
          description: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_amount?: number | null
          description: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_amount?: number | null
          description?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      smart_actions: {
        Row: {
          action_type: string | null
          config: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sticks_bricks_items: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          description: string | null
          floor_plan_id: string | null
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          floor_plan_id?: string | null
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          floor_plan_id?: string | null
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticks_bricks_items_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontracts: {
        Row: {
          contract_amount: number | null
          contract_number: string | null
          created_at: string
          entity_id: string | null
          id: string
          job_id: string | null
          paid_to_date: number | null
          status: string
          updated_at: string
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          contract_amount?: number | null
          contract_number?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          job_id?: string | null
          paid_to_date?: number | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          contract_amount?: number | null
          contract_number?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          job_id?: string | null
          paid_to_date?: number | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontracts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          member_count: number
          name: string
          status: string
          team_type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          member_count?: number
          name: string
          status?: string
          team_type?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          member_count?: number
          name?: string
          status?: string
          team_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_groups_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      upgrade_packages: {
        Row: {
          category: string
          created_at: string
          default_amount: number | null
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_amount?: number | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_amount?: number | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      upload_request_access_log: {
        Row: {
          action: string
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          item_id: string | null
          request_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          item_id?: string | null
          request_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          item_id?: string | null
          request_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_request_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_request_access_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "upload_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_request_access_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "upload_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_request_items: {
        Row: {
          accepted_extensions: string[] | null
          auto_tag: string | null
          created_at: string | null
          description: string | null
          destination_folder_id: string | null
          fulfilled_at: string | null
          fulfilled_document_id: string | null
          id: string
          is_required: boolean | null
          max_file_size: number | null
          name: string
          rejection_reason: string | null
          request_id: string
          sort_order: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_extensions?: string[] | null
          auto_tag?: string | null
          created_at?: string | null
          description?: string | null
          destination_folder_id?: string | null
          fulfilled_at?: string | null
          fulfilled_document_id?: string | null
          id?: string
          is_required?: boolean | null
          max_file_size?: number | null
          name: string
          rejection_reason?: string | null
          request_id: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_extensions?: string[] | null
          auto_tag?: string | null
          created_at?: string | null
          description?: string | null
          destination_folder_id?: string | null
          fulfilled_at?: string | null
          fulfilled_document_id?: string | null
          id?: string
          is_required?: boolean | null
          max_file_size?: number | null
          name?: string
          rejection_reason?: string | null
          request_id?: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_request_items_destination_folder_id_fkey"
            columns: ["destination_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_request_items_fulfilled_document_id_fkey"
            columns: ["fulfilled_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "upload_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_requests: {
        Row: {
          access_count: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          destination_folder_id: string | null
          due_date: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          max_total_upload_size: number | null
          message: string | null
          notify_on_complete: boolean | null
          notify_on_upload: boolean | null
          recipient_company: string | null
          recipient_contact_id: string | null
          recipient_email: string
          recipient_name: string
          record_id: string
          record_type: string
          reminder_sent_at: string | null
          request_token: string
          sent_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_folder_id?: string | null
          due_date?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          max_total_upload_size?: number | null
          message?: string | null
          notify_on_complete?: boolean | null
          notify_on_upload?: boolean | null
          recipient_company?: string | null
          recipient_contact_id?: string | null
          recipient_email: string
          recipient_name: string
          record_id: string
          record_type: string
          reminder_sent_at?: string | null
          request_token?: string
          sent_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_folder_id?: string | null
          due_date?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          max_total_upload_size?: number | null
          message?: string | null
          notify_on_complete?: boolean | null
          notify_on_upload?: boolean | null
          recipient_company?: string | null
          recipient_contact_id?: string | null
          recipient_email?: string
          recipient_name?: string
          record_id?: string
          record_type?: string
          reminder_sent_at?: string | null
          request_token?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_requests_destination_folder_id_fkey"
            columns: ["destination_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_requests_recipient_contact_id_fkey"
            columns: ["recipient_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          entity_id: string | null
          full_name: string | null
          id: string
          role: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          company_name: string
          created_at: string
          email: string | null
          entity_id: string | null
          id: string
          insurance_expiry: string | null
          license_expiry: string | null
          phone: string | null
          status: string
          trade: string | null
          updated_at: string
          w9_on_file: boolean | null
        }
        Insert: {
          company_name: string
          created_at?: string
          email?: string | null
          entity_id?: string | null
          id?: string
          insurance_expiry?: string | null
          license_expiry?: string | null
          phone?: string | null
          status?: string
          trade?: string | null
          updated_at?: string
          w9_on_file?: boolean | null
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string | null
          entity_id?: string | null
          id?: string
          insurance_expiry?: string | null
          license_expiry?: string | null
          phone?: string | null
          status?: string
          trade?: string | null
          updated_at?: string
          w9_on_file?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          assigned_to: string | null
          assignee: string | null
          category: string | null
          claim_number: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          job_id: string
          notes: string | null
          reported_by: string | null
          reported_date: string | null
          resolved_date: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignee?: string | null
          category?: string | null
          claim_number?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          notes?: string | null
          reported_by?: string | null
          reported_date?: string | null
          resolved_date?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignee?: string | null
          category?: string | null
          claim_number?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          reported_by?: string | null
          reported_date?: string | null
          resolved_date?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instance_milestones: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          name: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          name?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instance_milestones_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instance_tasks: {
        Row: {
          ai_generated: boolean
          assigned_role: string | null
          assigned_to_team: string | null
          assigned_to_user: string | null
          completed_at: string | null
          created_at: string
          depends_on: string[] | null
          description: string | null
          due_date: string | null
          id: string
          instance_id: string
          milestone_id: string | null
          sort_order: number
          status: string
          task_name: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          assigned_role?: string | null
          assigned_to_team?: string | null
          assigned_to_user?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id: string
          milestone_id?: string | null
          sort_order?: number
          status?: string
          task_name: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          assigned_role?: string | null
          assigned_to_team?: string | null
          assigned_to_user?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[] | null
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id?: string
          milestone_id?: string | null
          sort_order?: number
          status?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instance_tasks_assigned_to_team_fkey"
            columns: ["assigned_to_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instance_tasks_assigned_to_user_fkey"
            columns: ["assigned_to_user"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instance_tasks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instance_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "workflow_instance_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          ai_customization: Json | null
          chat_conversation: Json | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          id: string
          name: string
          record_id: string
          record_type: string
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          ai_customization?: Json | null
          chat_conversation?: Json | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          id?: string
          name: string
          record_id: string
          record_type: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_customization?: Json | null
          chat_conversation?: Json | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          id?: string
          name?: string
          record_id?: string
          record_type?: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_milestones: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_milestones_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assigned_to: string | null
          assigned_when: string | null
          completes_when: string | null
          created_at: string
          due_days: number | null
          from_reference: string | null
          id: string
          milestone_id: string | null
          sort_order: number
          task_name: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_when?: string | null
          completes_when?: string | null
          created_at?: string
          due_days?: number | null
          from_reference?: string | null
          id?: string
          milestone_id?: string | null
          sort_order?: number
          task_name: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          assigned_to?: string | null
          assigned_when?: string | null
          completes_when?: string | null
          created_at?: string
          due_days?: number | null
          from_reference?: string | null
          id?: string
          milestone_id?: string | null
          sort_order?: number
          task_name?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "workflow_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      balance_sheet_report: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number: string | null
          account_type: string | null
          balance: number | null
          entity_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      income_statement_report: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number: string | null
          account_type: string | null
          entity_id: string | null
          entry_date: string | null
          net_amount: number | null
          total_credits: number | null
          total_debits: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cost_summary: {
        Row: {
          actual: number | null
          budgeted: number | null
          committed: number | null
          cost_code: string | null
          cost_code_name: string | null
          entity_id: string | null
          id: string | null
          job_id: string | null
          job_name: string | null
          paid: number | null
          percent_complete: number | null
          project_name: string | null
          remaining: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_budget_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance_report: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_number: string | null
          account_type: string | null
          entity_id: string | null
          net_balance: number | null
          normal_balance: string | null
          total_credits: number | null
          total_debits: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_folder_template: {
        Args: {
          p_entity_id?: string
          p_record_id: string
          p_record_type: string
          p_template_id: string
        }
        Returns: undefined
      }
      auth_entity_id: { Args: never; Returns: string }
      clone_cost_book: {
        Args: {
          new_effective_date?: string
          new_name: string
          source_id: string
        }
        Returns: string
      }
      expire_document_shares: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
