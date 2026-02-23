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
      call_analyses: {
        Row: {
          action_items: Json | null
          analysis_storage_path: string | null
          call_disposition_ai: string | null
          cdr_record_id: string
          compliance_flags: Json | null
          compliance_score: number | null
          created_at: string
          custom_keyword_matches: Json | null
          escalation_reasons: string[] | null
          escalation_risk: string | null
          id: string
          keywords: Json | null
          metadata: Json | null
          objections: Json | null
          questions_asked: Json | null
          satisfaction_prediction: string | null
          satisfaction_score: number | null
          sentiment_overall: string | null
          sentiment_score: number | null
          sentiment_timeline: Json | null
          silence_seconds: number | null
          summary: string | null
          talk_ratio_agent: number | null
          talk_ratio_caller: number | null
          talk_time_agent_seconds: number | null
          talk_time_caller_seconds: number | null
          tenant_id: string
          topics: Json | null
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          analysis_storage_path?: string | null
          call_disposition_ai?: string | null
          cdr_record_id: string
          compliance_flags?: Json | null
          compliance_score?: number | null
          created_at?: string
          custom_keyword_matches?: Json | null
          escalation_reasons?: string[] | null
          escalation_risk?: string | null
          id?: string
          keywords?: Json | null
          metadata?: Json | null
          objections?: Json | null
          questions_asked?: Json | null
          satisfaction_prediction?: string | null
          satisfaction_score?: number | null
          sentiment_overall?: string | null
          sentiment_score?: number | null
          sentiment_timeline?: Json | null
          silence_seconds?: number | null
          summary?: string | null
          talk_ratio_agent?: number | null
          talk_ratio_caller?: number | null
          talk_time_agent_seconds?: number | null
          talk_time_caller_seconds?: number | null
          tenant_id: string
          topics?: Json | null
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          analysis_storage_path?: string | null
          call_disposition_ai?: string | null
          cdr_record_id?: string
          compliance_flags?: Json | null
          compliance_score?: number | null
          created_at?: string
          custom_keyword_matches?: Json | null
          escalation_reasons?: string[] | null
          escalation_risk?: string | null
          id?: string
          keywords?: Json | null
          metadata?: Json | null
          objections?: Json | null
          questions_asked?: Json | null
          satisfaction_prediction?: string | null
          satisfaction_score?: number | null
          sentiment_overall?: string | null
          sentiment_score?: number | null
          sentiment_timeline?: Json | null
          silence_seconds?: number | null
          summary?: string | null
          talk_ratio_agent?: number | null
          talk_ratio_caller?: number | null
          talk_time_agent_seconds?: number | null
          talk_time_caller_seconds?: number | null
          tenant_id?: string
          topics?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_analyses_cdr_record_id_fkey"
            columns: ["cdr_record_id"]
            isOneToOne: false
            referencedRelation: "cdr_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cdr_records: {
        Row: {
          accountcode: string | null
          amaflags: string | null
          analysis_storage_path: string | null
          answer_time: string | null
          billsec_seconds: number | null
          call_direction: string
          callid: string | null
          channel: string | null
          clid: string | null
          completed_at: string | null
          created_at: string
          dcontext: string | null
          did: string | null
          disposition: string
          dst: string
          dst_cnam: string | null
          dst_trunk_name: string | null
          dstchannel: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          lastapp: string | null
          lastdata: string | null
          linkedid: string | null
          metadata: Json | null
          outbound_cnam: string | null
          outbound_cnum: string | null
          pbx_connection_id: string
          peeraccount: string | null
          processing_status: string
          raw_webhook_payload: Json | null
          recording_filename: string | null
          recording_size_bytes: number | null
          recording_storage_path: string | null
          sequence: string | null
          session: string | null
          speaker_count: number | null
          src: string
          src_trunk_name: string | null
          start_time: string | null
          tenant_id: string
          transcript_confidence: number | null
          transcript_storage_path: string | null
          transcript_text_storage_path: string | null
          transcript_word_count: number | null
          uniqueid: string
          updated_at: string
          userfield: string | null
        }
        Insert: {
          accountcode?: string | null
          amaflags?: string | null
          analysis_storage_path?: string | null
          answer_time?: string | null
          billsec_seconds?: number | null
          call_direction: string
          callid?: string | null
          channel?: string | null
          clid?: string | null
          completed_at?: string | null
          created_at?: string
          dcontext?: string | null
          did?: string | null
          disposition: string
          dst: string
          dst_cnam?: string | null
          dst_trunk_name?: string | null
          dstchannel?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          lastapp?: string | null
          lastdata?: string | null
          linkedid?: string | null
          metadata?: Json | null
          outbound_cnam?: string | null
          outbound_cnum?: string | null
          pbx_connection_id: string
          peeraccount?: string | null
          processing_status?: string
          raw_webhook_payload?: Json | null
          recording_filename?: string | null
          recording_size_bytes?: number | null
          recording_storage_path?: string | null
          sequence?: string | null
          session?: string | null
          speaker_count?: number | null
          src: string
          src_trunk_name?: string | null
          start_time?: string | null
          tenant_id: string
          transcript_confidence?: number | null
          transcript_storage_path?: string | null
          transcript_text_storage_path?: string | null
          transcript_word_count?: number | null
          uniqueid: string
          updated_at?: string
          userfield?: string | null
        }
        Update: {
          accountcode?: string | null
          amaflags?: string | null
          analysis_storage_path?: string | null
          answer_time?: string | null
          billsec_seconds?: number | null
          call_direction?: string
          callid?: string | null
          channel?: string | null
          clid?: string | null
          completed_at?: string | null
          created_at?: string
          dcontext?: string | null
          did?: string | null
          disposition?: string
          dst?: string
          dst_cnam?: string | null
          dst_trunk_name?: string | null
          dstchannel?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          lastapp?: string | null
          lastdata?: string | null
          linkedid?: string | null
          metadata?: Json | null
          outbound_cnam?: string | null
          outbound_cnum?: string | null
          pbx_connection_id?: string
          peeraccount?: string | null
          processing_status?: string
          raw_webhook_payload?: Json | null
          recording_filename?: string | null
          recording_size_bytes?: number | null
          recording_storage_path?: string | null
          sequence?: string | null
          session?: string | null
          speaker_count?: number | null
          src?: string
          src_trunk_name?: string | null
          start_time?: string | null
          tenant_id?: string
          transcript_confidence?: number | null
          transcript_storage_path?: string | null
          transcript_text_storage_path?: string | null
          transcript_word_count?: number | null
          uniqueid?: string
          updated_at?: string
          userfield?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cdr_records_pbx_connection_id_fkey"
            columns: ["pbx_connection_id"]
            isOneToOne: false
            referencedRelation: "pbx_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cdr_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number | null
          cdr_record_id: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_type: string
          max_attempts: number | null
          metadata: Json | null
          priority: number | null
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          cdr_record_id: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          cdr_record_id?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_cdr_record_id_fkey"
            columns: ["cdr_record_id"]
            isOneToOne: false
            referencedRelation: "cdr_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pbx_connections: {
        Row: {
          connection_type: string
          created_at: string
          host: string
          id: string
          last_connected_at: string | null
          last_error: string | null
          metadata: Json | null
          name: string
          password_encrypted: string
          port: number
          status: string
          tenant_id: string
          updated_at: string
          username: string
          verify_ssl: boolean | null
          webhook_secret: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          host: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          metadata?: Json | null
          name: string
          password_encrypted: string
          port?: number
          status?: string
          tenant_id: string
          updated_at?: string
          username: string
          verify_ssl?: boolean | null
          webhook_secret: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          host?: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          metadata?: Json | null
          name?: string
          password_encrypted?: string
          port?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          username?: string
          verify_ssl?: boolean | null
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "pbx_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ai_custom_keywords: string[] | null
          audio_minutes_total: number | null
          billing_email: string | null
          billing_plan: string | null
          calls_processed_total: number | null
          created_at: string
          id: string
          metadata: Json | null
          name: string
          recording_retention_days: number | null
          slug: string
          status: string
          storage_bytes_total: number | null
          updated_at: string
        }
        Insert: {
          ai_custom_keywords?: string[] | null
          audio_minutes_total?: number | null
          billing_email?: string | null
          billing_plan?: string | null
          calls_processed_total?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          recording_retention_days?: number | null
          slug: string
          status?: string
          storage_bytes_total?: number | null
          updated_at?: string
        }
        Update: {
          ai_custom_keywords?: string[] | null
          audio_minutes_total?: number | null
          billing_email?: string | null
          billing_plan?: string | null
          calls_processed_total?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          recording_retention_days?: number | null
          slug?: string
          status?: string
          storage_bytes_total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          email_notifications_enabled: boolean | null
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          metadata: Json | null
          role: string
          tenant_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          metadata?: Json | null
          role?: string
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          metadata?: Json | null
          role?: string
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_next_job: {
        Args: never
        Returns: {
          attempts: number | null
          cdr_record_id: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_type: string
          max_attempts: number | null
          metadata: Json | null
          priority: number | null
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "job_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_tenant_usage: {
        Args: {
          p_audio_minutes?: number
          p_calls_processed?: number
          p_storage_bytes?: number
          p_tenant_id: string
        }
        Returns: undefined
      }
      reset_stale_jobs: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
