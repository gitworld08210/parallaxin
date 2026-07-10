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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliation_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          affiliation_id: string | null
          created_at: string
          id: string
          metadata: Json
          org_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          affiliation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          org_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          affiliation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_id: string
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user: string
          id: string
          kind: string
          payload: Json
          to_user: string
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user: string
          id?: string
          kind: string
          payload: Json
          to_user: string
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: string
          payload?: Json
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          accepted_at: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at: string
          duration_sec: number
          ended_at: string | null
          id: string
          is_group: boolean
          kind: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          is_group?: boolean
          kind: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          callee_id?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          is_group?: boolean
          kind?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          owner_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          environment: string
          id: string
          kind: string
          price_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          environment?: string
          id?: string
          kind: string
          price_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          environment?: string
          id?: string
          kind?: string
          price_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          post_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          post_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conv_participants_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          title: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Relationships: []
      }
      creator_balance: {
        Row: {
          available_cents: number
          currency: string
          environment: string
          lifetime_earned_cents: number
          pending_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_cents?: number
          currency?: string
          environment?: string
          lifetime_earned_cents?: number
          pending_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_cents?: number
          currency?: string
          environment?: string
          lifetime_earned_cents?: number
          pending_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      dm_unlocks: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          net_cents: number
          paid_at: string | null
          platform_fee_cents: number
          recipient_id: string
          sender_id: string
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          recipient_id: string
          sender_id: string
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          recipient_id?: string
          sender_id?: string
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_profile_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_profile_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      founder_seats: {
        Row: {
          council_role: Database["public"]["Enums"]["council_role"] | null
          created_at: string
          founder_title: string | null
          id: string
          is_active: boolean
          revoke_reason: string | null
          seat_number: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          council_role?: Database["public"]["Enums"]["council_role"] | null
          created_at?: string
          founder_title?: string | null
          id?: string
          is_active?: boolean
          revoke_reason?: string | null
          seat_number: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          council_role?: Database["public"]["Enums"]["council_role"] | null
          created_at?: string
          founder_title?: string | null
          id?: string
          is_active?: boolean
          revoke_reason?: string | null
          seat_number?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      highlight_items: {
        Row: {
          created_at: string
          highlight_id: string
          position: number
          story_id: string
        }
        Insert: {
          created_at?: string
          highlight_id: string
          position?: number
          story_id: string
        }
        Update: {
          created_at?: string
          highlight_id?: string
          position?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_items_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          bank_account_number: string
          bank_ifsc: string
          bank_name: string | null
          created_at: string
          full_name: string
          id: string
          id_photo_url: string
          pan_number: string | null
          passbook_photo_url: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_number: string
          bank_ifsc: string
          bank_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          id_photo_url: string
          pan_number?: string | null
          passbook_photo_url: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_number?: string
          bank_ifsc?: string
          bank_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_photo_url?: string
          pan_number?: string | null
          passbook_photo_url?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_chat: {
        Row: {
          body: string
          created_at: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          livekit_room: string
          started_at: string
          status: string
          title: string | null
          viewer_count: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          livekit_room: string
          started_at?: string
          status?: string
          title?: string | null
          viewer_count?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          livekit_room?: string
          started_at?: string
          status?: string
          title?: string | null
          viewer_count?: number
        }
        Relationships: []
      }
      login_events: {
        Row: {
          city: string | null
          created_at: string
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          media_type: string | null
          media_url: string | null
          read_at: string | null
          sender_id: string
          shared_post_id: string | null
          shared_story_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id: string
          shared_post_id?: string | null
          shared_story_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
          shared_post_id?: string | null
          shared_story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_profile_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          title: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          title: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_departments: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "organization_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          organization_id: string
          status: string
          username: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          organization_id: string
          status?: string
          username?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          organization_id?: string
          status?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_member_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          member_id: string
          role_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          member_id: string
          role_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "organization_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organization_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
          permission_key: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
          permission_key: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
          permission_key?: string
        }
        Relationships: []
      }
      organization_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "organization_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_roles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          organization_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          organization_id: string
          priority?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          accent_color: string | null
          ai_enabled: boolean
          allow_direct_messages: boolean
          allow_member_invites: boolean
          allow_public_posts: boolean
          created_at: string
          language: string
          logo_shape: string | null
          organization_id: string
          require_join_approval: boolean
          theme_color: string | null
          timezone: string
          updated_at: string
          visibility: string
        }
        Insert: {
          accent_color?: string | null
          ai_enabled?: boolean
          allow_direct_messages?: boolean
          allow_member_invites?: boolean
          allow_public_posts?: boolean
          created_at?: string
          language?: string
          logo_shape?: string | null
          organization_id: string
          require_join_approval?: boolean
          theme_color?: string | null
          timezone?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          accent_color?: string | null
          ai_enabled?: boolean
          allow_direct_messages?: boolean
          allow_member_invites?: boolean
          allow_public_posts?: boolean
          created_at?: string
          language?: string
          logo_shape?: string | null
          organization_id?: string
          require_join_approval?: boolean
          theme_color?: string | null
          timezone?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bio: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          member_count: number | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          owner_user_id: string
          phone: string | null
          post_count: number | null
          updated_at: string | null
          username: string
          verified: boolean | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          member_count?: number | null
          name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          owner_user_id: string
          phone?: string | null
          post_count?: number | null
          updated_at?: string | null
          username: string
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          member_count?: number | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          owner_user_id?: string
          phone?: string | null
          post_count?: number | null
          updated_at?: string | null
          username?: string
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ownership_certificates: {
        Row: {
          bitcoin_block_height: number | null
          content_hash: string
          created_at: string
          creator_id: string
          id: string
          media_type: string
          media_url: string
          ots_confirmed_at: string | null
          ots_last_attempt_at: string | null
          ots_proof: string | null
          ots_status: string
          post_id: string
          updated_at: string
        }
        Insert: {
          bitcoin_block_height?: number | null
          content_hash: string
          created_at?: string
          creator_id: string
          id?: string
          media_type: string
          media_url: string
          ots_confirmed_at?: string | null
          ots_last_attempt_at?: string | null
          ots_proof?: string | null
          ots_status?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          bitcoin_block_height?: number | null
          content_hash?: string
          created_at?: string
          creator_id?: string
          id?: string
          media_type?: string
          media_url?: string
          ots_confirmed_at?: string | null
          ots_last_attempt_at?: string | null
          ots_proof?: string | null
          ots_status?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_certificates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ownership_certificates_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          method: string
          payout_detail: Json
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          method: string
          payout_detail?: Json
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          method?: string
          payout_detail?: Json
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_collaborators: {
        Row: {
          invited_at: string
          post_id: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          invited_at?: string
          post_id: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          invited_at?: string
          post_id?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_collaborators_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_embeddings: {
        Row: {
          content_hash: string
          embedding: string
          post_id: string
          updated_at: string
        }
        Insert: {
          content_hash: string
          embedding: string
          post_id: string
          updated_at?: string
        }
        Update: {
          content_hash?: string
          embedding?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_embeddings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_unlocks: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          currency: string
          environment: string
          id: string
          net_cents: number
          paid_at: string | null
          platform_fee_cents: number
          post_id: string
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id: string
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          currency?: string
          environment?: string
          id?: string
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_unlocks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          authenticity_breakdown: Json | null
          authenticity_checked_at: string | null
          authenticity_score: number | null
          comment_count: number
          content: string
          created_at: string
          has_certificate: boolean
          id: string
          is_paid: boolean
          is_pinned: boolean
          is_reel: boolean
          like_count: number
          media_type: string | null
          media_url: string | null
          pinned_at: string | null
          price_cents: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          authenticity_breakdown?: Json | null
          authenticity_checked_at?: string | null
          authenticity_score?: number | null
          comment_count?: number
          content?: string
          created_at?: string
          has_certificate?: boolean
          id?: string
          is_paid?: boolean
          is_pinned?: boolean
          is_reel?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          price_cents?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          authenticity_breakdown?: Json | null
          authenticity_checked_at?: string | null
          authenticity_score?: number | null
          comment_count?: number
          content?: string
          created_at?: string
          has_certificate?: boolean
          id?: string
          is_paid?: boolean
          is_pinned?: boolean
          is_reel?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          price_cents?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          ai_dm_suggestions_enabled: boolean
          aura_rank: string | null
          avatar_url: string | null
          bio: string | null
          chronicle: string | null
          contribution_score: number
          council_role: Database["public"]["Enums"]["council_role"] | null
          council_vote_weight: number
          cover_url: string | null
          created_at: string
          creator_since: string | null
          creator_terms_version: string | null
          display_name: string
          followers_count: number
          following_count: number
          founder_level: number
          founder_title: string | null
          id: string
          interests: string[]
          is_creator: boolean
          is_founder: boolean
          is_private: boolean
          join_era: string | null
          last_seen_at: string | null
          onboarded_at: string | null
          organization_id: string | null
          posts_count: number
          show_activity: boolean
          show_read_receipts: boolean
          signature_aura: string | null
          tier: string
          updated_at: string
          user_id: string
          username: string
          verification_kind: string | null
          verified: boolean
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          ai_dm_suggestions_enabled?: boolean
          aura_rank?: string | null
          avatar_url?: string | null
          bio?: string | null
          chronicle?: string | null
          contribution_score?: number
          council_role?: Database["public"]["Enums"]["council_role"] | null
          council_vote_weight?: number
          cover_url?: string | null
          created_at?: string
          creator_since?: string | null
          creator_terms_version?: string | null
          display_name?: string
          followers_count?: number
          following_count?: number
          founder_level?: number
          founder_title?: string | null
          id?: string
          interests?: string[]
          is_creator?: boolean
          is_founder?: boolean
          is_private?: boolean
          join_era?: string | null
          last_seen_at?: string | null
          onboarded_at?: string | null
          organization_id?: string | null
          posts_count?: number
          show_activity?: boolean
          show_read_receipts?: boolean
          signature_aura?: string | null
          tier?: string
          updated_at?: string
          user_id: string
          username: string
          verification_kind?: string | null
          verified?: boolean
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          ai_dm_suggestions_enabled?: boolean
          aura_rank?: string | null
          avatar_url?: string | null
          bio?: string | null
          chronicle?: string | null
          contribution_score?: number
          council_role?: Database["public"]["Enums"]["council_role"] | null
          council_vote_weight?: number
          cover_url?: string | null
          created_at?: string
          creator_since?: string | null
          creator_terms_version?: string | null
          display_name?: string
          followers_count?: number
          following_count?: number
          founder_level?: number
          founder_title?: string | null
          id?: string
          interests?: string[]
          is_creator?: boolean
          is_founder?: boolean
          is_private?: boolean
          join_era?: string | null
          last_seen_at?: string | null
          onboarded_at?: string | null
          organization_id?: string | null
          posts_count?: number
          show_activity?: boolean
          show_read_receipts?: boolean
          signature_aura?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
          username?: string
          verification_kind?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          coin_balance: number
          creator_terms_accepted_at: string | null
          deletion_scheduled_at: string | null
          dm_price_cents: number
          dob: string | null
          gender: string | null
          payment_qr_url: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          coin_balance?: number
          creator_terms_accepted_at?: string | null
          deletion_scheduled_at?: string | null
          dm_price_cents?: number
          dob?: string | null
          gender?: string | null
          payment_qr_url?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          coin_balance?: number
          creator_terms_accepted_at?: string | null
          deletion_scheduled_at?: string | null
          dm_price_cents?: number
          dob?: string | null
          gender?: string | null
          payment_qr_url?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_kind: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_kind?: string
        }
        Relationships: []
      }
      saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          audience: Database["public"]["Enums"]["story_audience"]
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["story_audience"]
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["story_audience"]
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: []
      }
      story_sticker_responses: {
        Row: {
          created_at: string
          id: string
          response: Json
          sticker_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response: Json
          sticker_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response?: Json
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_sticker_responses_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "story_stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      story_stickers: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          position: Json
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          position?: Json
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          position?: Json
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_stickers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          dispute_reason: string | null
          environment: string
          id: string
          message: string | null
          net_cents: number
          paid_at: string | null
          platform_fee_cents: number
          post_id: string | null
          recipient_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string
          status: string
          stripe_session_id: string | null
          submitted_at: string | null
          utr: string | null
          verified_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          environment?: string
          id?: string
          message?: string | null
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id?: string | null
          recipient_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id: string
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          utr?: string | null
          verified_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          dispute_reason?: string | null
          environment?: string
          id?: string
          message?: string | null
          net_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number
          post_id?: string | null
          recipient_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          utr?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tips_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_interest_vectors: {
        Row: {
          embedding: string
          updated_at: string
          user_id: string
        }
        Insert: {
          embedding: string
          updated_at?: string
          user_id: string
        }
        Update: {
          embedding?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          approved: boolean
          category: string
          country: string | null
          created_at: string
          dob: string | null
          full_name: string
          id: string
          id_doc_url: string | null
          links: string[] | null
          official_email: string | null
          organization: string | null
          reason: string | null
          reviewed_at: string | null
          status: string
          supporting_doc_url: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          category: string
          country?: string | null
          created_at?: string
          dob?: string | null
          full_name: string
          id?: string
          id_doc_url?: string | null
          links?: string[] | null
          official_email?: string | null
          organization?: string | null
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          supporting_doc_url?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          category?: string
          country?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string
          id?: string
          id_doc_url?: string | null
          links?: string[] | null
          official_email?: string | null
          organization?: string | null
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          supporting_doc_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_group_member: {
        Args: { _conv: string; _user: string }
        Returns: undefined
      }
      admin_approve_kyc: { Args: { _kyc_id: string }; Returns: undefined }
      admin_approve_payout: {
        Args: { _note?: string; _payout_id: string }
        Returns: undefined
      }
      admin_approve_tip: { Args: { _tip_id: string }; Returns: undefined }
      admin_reject_kyc: {
        Args: { _kyc_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_payout: {
        Args: { _payout_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_tip: {
        Args: { _reason: string; _tip_id: string }
        Returns: undefined
      }
      admin_revoke_tip: {
        Args: { _reason: string; _tip_id: string }
        Returns: undefined
      }
      assign_owner_role: {
        Args: { p_member_id: string; p_organization_id: string }
        Returns: undefined
      }
      become_creator: { Args: { _terms_version: string }; Returns: undefined }
      create_group: {
        Args: { _member_ids: string[]; _title: string }
        Returns: string
      }
      create_organization: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_org_type: Database["public"]["Enums"]["org_type"]
          p_owner_user_id: string
          p_username: string
        }
        Returns: string
      }
      create_organization_workspace: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_org_type: Database["public"]["Enums"]["org_type"]
          p_username: string
        }
        Returns: string
      }
      create_tip: {
        Args: {
          _amount_cents: number
          _message: string
          _post_id: string
          _recipient_id: string
        }
        Returns: string
      }
      credit_coins: {
        Args: {
          _amount: number
          _environment: string
          _price_id: string
          _session_id: string
          _user_id: string
        }
        Returns: undefined
      }
      credit_creator: {
        Args: {
          _currency?: string
          _environment: string
          _net_cents: number
          _user_id: string
        }
        Returns: undefined
      }
      get_certificate_by_hash: {
        Args: { _hash: string }
        Returns: {
          bitcoin_block_height: number
          content_hash: string
          created_at: string
          creator_id: string
          creator_username: string
          id: string
          media_type: string
          media_url: string
          ots_confirmed_at: string
          ots_status: string
          post_id: string
        }[]
      }
      get_platform_pay_config: {
        Args: never
        Returns: {
          payee_name: string
          qr_url: string
          upi_id: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_approved_kyc: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_default_departments: {
        Args: { p_organization_id: string; p_owner_user_id: string }
        Returns: undefined
      }
      initialize_default_role_permissions: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      initialize_default_roles: {
        Args: { p_organization_id: string; p_owner_user_id: string }
        Returns: undefined
      }
      initialize_owner_member: {
        Args: { p_organization_id: string; p_owner_user_id: string }
        Returns: string
      }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      is_organization_admin: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      is_organization_owner: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      issue_affiliation: {
        Args: {
          _ended_on: string
          _note: string
          _org_id: string
          _role: Database["public"]["Enums"]["affiliation_role"]
          _started_on: string
          _target_username: string
        }
        Returns: string
      }
      leave_group: { Args: { _conv: string }; Returns: undefined }
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      match_posts_for_user: {
        Args: { _match_count?: number; _user_id: string }
        Returns: {
          post_id: string
          similarity: number
        }[]
      }
      remove_group_member: {
        Args: { _conv: string; _user: string }
        Returns: undefined
      }
      request_payout: {
        Args: {
          _amount_cents: number
          _environment: string
          _method: string
          _payout_detail: Json
        }
        Returns: string
      }
      respond_affiliation: {
        Args: { _accept: boolean; _aff_id: string }
        Returns: undefined
      }
      revoke_affiliation: {
        Args: { _aff_id: string; _reason: string }
        Returns: undefined
      }
      start_dm: { Args: { other_user_id: string }; Returns: string }
      toggle_post_pin: {
        Args: { _pin: boolean; _post_id: string }
        Returns: undefined
      }
      update_affiliation_role: {
        Args: {
          _aff_id: string
          _role: Database["public"]["Enums"]["affiliation_role"]
        }
        Returns: undefined
      }
      upsert_profile_private: {
        Args: { _dob: string; _gender: string }
        Returns: undefined
      }
      verify_tip_with_utr: {
        Args: { _tip_id: string; _utr: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "personal" | "organization"
      affiliation_role:
        | "founder"
        | "co_founder"
        | "ceo"
        | "cto"
        | "employee"
        | "brand_ambassador"
        | "official_representative"
        | "advisor"
        | "investor"
        | "moderator"
      affiliation_status:
        | "pending"
        | "active"
        | "declined"
        | "revoked"
        | "ended"
      app_role: "admin" | "moderator" | "user"
      council_role: "architect" | "curator" | "sentinel" | "innovator"
      org_member_role: "owner" | "admin" | "manager" | "viewer"
      org_type:
        | "startup"
        | "company"
        | "education"
        | "ngo"
        | "government"
        | "creator"
        | "community"
        | "other"
      post_status: "draft" | "scheduled" | "published"
      story_audience: "public" | "close_friends"
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
  public: {
    Enums: {
      account_type: ["personal", "organization"],
      affiliation_role: [
        "founder",
        "co_founder",
        "ceo",
        "cto",
        "employee",
        "brand_ambassador",
        "official_representative",
        "advisor",
        "investor",
        "moderator",
      ],
      affiliation_status: ["pending", "active", "declined", "revoked", "ended"],
      app_role: ["admin", "moderator", "user"],
      council_role: ["architect", "curator", "sentinel", "innovator"],
      org_member_role: ["owner", "admin", "manager", "viewer"],
      org_type: [
        "startup",
        "company",
        "education",
        "ngo",
        "government",
        "creator",
        "community",
        "other",
      ],
      post_status: ["draft", "scheduled", "published"],
      story_audience: ["public", "close_friends"],
    },
  },
} as const
