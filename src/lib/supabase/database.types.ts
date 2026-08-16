export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      gamibar_session_file_shares: {
        Row: {
          created_at: string;
          room_id: string;
          share_slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          room_id: string;
          share_slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          room_id?: string;
          share_slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_session_file_shares_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: true;
            referencedRelation: "gamibar_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      gamibar_session_files: {
        Row: {
          byte_size: number;
          created_at: string;
          deleted_at: string | null;
          downloaded_count: number;
          expires_at: string;
          id: string;
          last_downloaded_at: string | null;
          mime_type: string;
          original_name: string;
          room_id: string;
          storage_path: string;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          deleted_at?: string | null;
          downloaded_count?: number;
          expires_at?: string;
          id?: string;
          last_downloaded_at?: string | null;
          mime_type: string;
          original_name: string;
          room_id: string;
          storage_path: string;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          deleted_at?: string | null;
          downloaded_count?: number;
          expires_at?: string;
          id?: string;
          last_downloaded_at?: string | null;
          mime_type?: string;
          original_name?: string;
          room_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_session_files_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      gamibar_attempts: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          correct_count: number;
          created_at: string;
          duration_ms: number | null;
          id: string;
          mode: Database["public"]["Enums"]["gamibar_game_mode"];
          participant_id: string;
          payload: Json;
          progress: number;
          room_id: string;
          score: number | null;
          updated_at: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          correct_count?: number;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          mode: Database["public"]["Enums"]["gamibar_game_mode"];
          participant_id: string;
          payload?: Json;
          progress?: number;
          room_id: string;
          score?: number | null;
          updated_at?: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          correct_count?: number;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          mode?: Database["public"]["Enums"]["gamibar_game_mode"];
          participant_id?: string;
          payload?: Json;
          progress?: number;
          room_id?: string;
          score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_attempts_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gamibar_attempts_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      gamibar_jigsaw_assets: {
        Row: {
          byte_size: number | null;
          cols: number;
          created_at: string;
          id: string;
          mime_type: string;
          room_id: string;
          rows: number;
          storage_path: string;
        };
        Insert: {
          byte_size?: number | null;
          cols?: number;
          created_at?: string;
          id?: string;
          mime_type: string;
          room_id: string;
          rows?: number;
          storage_path: string;
        };
        Update: {
          byte_size?: number | null;
          cols?: number;
          created_at?: string;
          id?: string;
          mime_type?: string;
          room_id?: string;
          rows?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_jigsaw_assets_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: true;
            referencedRelation: "gamibar_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      gamibar_participants: {
        Row: {
          display_name: string;
          id: string;
          joined_at: string;
          last_seen_at: string;
          reconnect_token_hash: string;
          room_id: string;
          status: Database["public"]["Enums"]["gamibar_participant_status"];
          user_id: string | null;
        };
        Insert: {
          display_name: string;
          id?: string;
          joined_at?: string;
          last_seen_at?: string;
          reconnect_token_hash: string;
          room_id: string;
          status?: Database["public"]["Enums"]["gamibar_participant_status"];
          user_id?: string | null;
        };
        Update: {
          display_name?: string;
          id?: string;
          joined_at?: string;
          last_seen_at?: string;
          reconnect_token_hash?: string;
          room_id?: string;
          status?: Database["public"]["Enums"]["gamibar_participant_status"];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_participants_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gamibar_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_authors";
            referencedColumns: ["id"];
          },
        ];
      };
      gamibar_authors: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          role: Database["public"]["Enums"]["gamibar_user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          role?: Database["public"]["Enums"]["gamibar_user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["gamibar_user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      gamibar_quiz_answers: {
        Row: {
          id: string;
          is_correct: boolean;
          participant_id: string;
          question_id: string;
          room_id: string;
          selected_option: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          is_correct: boolean;
          participant_id: string;
          question_id: string;
          room_id: string;
          selected_option: string;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          is_correct?: boolean;
          participant_id?: string;
          question_id?: string;
          room_id?: string;
          selected_option?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_quiz_answers_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gamibar_quiz_answers_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      gamibar_rooms: {
        Row: {
          author_id: string | null;
          author_name: string;
          author_token_hash: string;
          code: string;
          config: Json;
          created_at: string;
          ends_at: string | null;
          events: Json;
          finished_at: string | null;
          id: string;
          max_participants: number;
          mode: Database["public"]["Enums"]["gamibar_game_mode"];
          name: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["gamibar_room_status"];
          subject: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          author_name: string;
          author_token_hash: string;
          code: string;
          config?: Json;
          created_at?: string;
          ends_at?: string | null;
          events?: Json;
          finished_at?: string | null;
          id?: string;
          max_participants?: number;
          mode: Database["public"]["Enums"]["gamibar_game_mode"];
          name: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["gamibar_room_status"];
          subject?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string;
          author_token_hash?: string;
          code?: string;
          config?: Json;
          created_at?: string;
          ends_at?: string | null;
          events?: Json;
          finished_at?: string | null;
          id?: string;
          max_participants?: number;
          mode?: Database["public"]["Enums"]["gamibar_game_mode"];
          name?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["gamibar_room_status"];
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gamibar_rooms_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "gamibar_authors";
            referencedColumns: ["id"];
          },
        ];
      };
      jigsaw_categories: {
        Row: {
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          slug: string;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          slug: string;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          slug?: string;
          sort_order?: number | null;
        };
        Relationships: [];
      };
      jigsaw_library_images: {
        Row: {
          category_id: string;
          created_at: string | null;
          description: string | null;
          file_size_bytes: number | null;
          format: string | null;
          height: number | null;
          id: string;
          illustration_type: string | null;
          keywords: string[] | null;
          slug: string;
          source: string | null;
          status: string | null;
          storage_path: string;
          subtopic_id: string;
          thumbnail_path: string | null;
          title: string;
          updated_at: string | null;
          usage_count: number | null;
          width: number | null;
        };
        Insert: {
          category_id: string;
          created_at?: string | null;
          description?: string | null;
          file_size_bytes?: number | null;
          format?: string | null;
          height?: number | null;
          id?: string;
          illustration_type?: string | null;
          keywords?: string[] | null;
          slug: string;
          source?: string | null;
          status?: string | null;
          storage_path: string;
          subtopic_id: string;
          thumbnail_path?: string | null;
          title: string;
          updated_at?: string | null;
          usage_count?: number | null;
          width?: number | null;
        };
        Update: {
          category_id?: string;
          created_at?: string | null;
          description?: string | null;
          file_size_bytes?: number | null;
          format?: string | null;
          height?: number | null;
          id?: string;
          illustration_type?: string | null;
          keywords?: string[] | null;
          slug?: string;
          source?: string | null;
          status?: string | null;
          storage_path?: string;
          subtopic_id?: string;
          thumbnail_path?: string | null;
          title?: string;
          updated_at?: string | null;
          usage_count?: number | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "jigsaw_library_images_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "jigsaw_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jigsaw_library_images_subtopic_id_fkey";
            columns: ["subtopic_id"];
            isOneToOne: false;
            referencedRelation: "jigsaw_subtopics";
            referencedColumns: ["id"];
          },
        ];
      };
      jigsaw_subtopics: {
        Row: {
          category_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          slug: string;
          sort_order: number | null;
        };
        Insert: {
          category_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          slug: string;
          sort_order?: number | null;
        };
        Update: {
          category_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          slug?: string;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "jigsaw_subtopics_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "jigsaw_categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_jigsaw_library_usage: {
        Args: { p_image_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      gamibar_game_mode: "quiz" | "quiz_jigsaw" | "jigsaw" | "maze" | "connect_dots";
      gamibar_participant_status: "ONLINE" | "DISCONNECTED" | "PLAYING" | "COMPLETED";
      gamibar_room_status:
        "DRAFT" | "LOBBY" | "READY" | "COUNTDOWN" | "LIVE" | "FINISHED" | "CANCELLED";
      gamibar_user_role: "author" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      gamibar_game_mode: ["quiz", "quiz_jigsaw", "jigsaw", "maze", "connect_dots"],
      gamibar_participant_status: ["ONLINE", "DISCONNECTED", "PLAYING", "COMPLETED"],
      gamibar_room_status: [
        "DRAFT",
        "LOBBY",
        "READY",
        "COUNTDOWN",
        "LIVE",
        "FINISHED",
        "CANCELLED",
      ],
      gamibar_user_role: ["author", "student"],
    },
  },
} as const;
