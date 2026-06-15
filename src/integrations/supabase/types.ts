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
      api_request_log: {
        Row: {
          criado_em: string
          escopos: string[] | null
          id: string
          ip: string | null
          latencia_ms: number | null
          metodo: string
          rota: string
          status: number
          tenant_id: string
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          criado_em?: string
          escopos?: string[] | null
          id?: string
          ip?: string | null
          latencia_ms?: number | null
          metodo: string
          rota: string
          status: number
          tenant_id: string
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          criado_em?: string
          escopos?: string[] | null
          id?: string
          ip?: string | null
          latencia_ms?: number | null
          metodo?: string
          rota?: string
          status?: number
          tenant_id?: string
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_log_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "api_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          criado_em: string
          criado_por: string | null
          escopos: string[]
          expira_em: string | null
          id: string
          nome: string
          prefixo: string
          revogado: boolean
          tenant_id: string
          token_hash: string
          ultimo_uso_em: string | null
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          escopos?: string[]
          expira_em?: string | null
          id?: string
          nome: string
          prefixo: string
          revogado?: boolean
          tenant_id: string
          token_hash: string
          ultimo_uso_em?: string | null
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          escopos?: string[]
          expira_em?: string | null
          id?: string
          nome?: string
          prefixo?: string
          revogado?: boolean
          tenant_id?: string
          token_hash?: string
          ultimo_uso_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          assinado_em: string
          criado_em: string
          documento_id: string
          hash_sha256: string
          id: string
          ip: unknown
          papel: string | null
          signatario_email: string | null
          signatario_id: string | null
          signatario_nome: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          assinado_em?: string
          criado_em?: string
          documento_id: string
          hash_sha256: string
          id?: string
          ip?: unknown
          papel?: string | null
          signatario_email?: string | null
          signatario_id?: string | null
          signatario_nome: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          assinado_em?: string
          criado_em?: string
          documento_id?: string
          hash_sha256?: string
          id?: string
          ip?: unknown
          papel?: string | null
          signatario_email?: string | null
          signatario_id?: string | null
          signatario_nome?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          dados_antes: Json | null
          dados_depois: Json | null
          em: string
          id: string
          registro_id: string | null
          tabela: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          em?: string
          id?: string
          registro_id?: string | null
          tabela: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          em?: string
          id?: string
          registro_id?: string | null
          tabela?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cepram_divisoes: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          id: string
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cepram_enquadramentos: {
        Row: {
          ativo: boolean
          classe: number
          created_at: string
          faixa_max: number | null
          faixa_min: number
          id: string
          observacao: string | null
          porte: Database["public"]["Enums"]["porte_empreendimento"]
          potencial_poluidor: Database["public"]["Enums"]["potencial_poluidor"]
          tipologia_id: string
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          classe: number
          created_at?: string
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          observacao?: string | null
          porte: Database["public"]["Enums"]["porte_empreendimento"]
          potencial_poluidor: Database["public"]["Enums"]["potencial_poluidor"]
          tipologia_id: string
          unidade_medida: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          classe?: number
          created_at?: string
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          observacao?: string | null
          porte?: Database["public"]["Enums"]["porte_empreendimento"]
          potencial_poluidor?: Database["public"]["Enums"]["potencial_poluidor"]
          tipologia_id?: string
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cepram_enquadramentos_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "cepram_tipologias"
            referencedColumns: ["id"]
          },
        ]
      }
      cepram_grupos: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          divisao_id: string
          id: string
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          divisao_id: string
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          divisao_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cepram_grupos_divisao_id_fkey"
            columns: ["divisao_id"]
            isOneToOne: false
            referencedRelation: "cepram_divisoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cepram_tipologias: {
        Row: {
          ativo: boolean
          created_at: string
          grupo_id: string
          id: string
          nome: string
          unidade_medida_default: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
          unidade_medida_default?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
          unidade_medida_default?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cepram_tipologias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "cepram_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades: {
        Row: {
          criado_em: string
          ibge_codigo: string | null
          id: string
          municipio_id: number | null
          nome: string
          uf: string
        }
        Insert: {
          criado_em?: string
          ibge_codigo?: string | null
          id?: string
          municipio_id?: number | null
          nome: string
          uf: string
        }
        Update: {
          criado_em?: string
          ibge_codigo?: string | null
          id?: string
          municipio_id?: number | null
          nome?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "cidades_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "cidades_compat"
            referencedColumns: ["municipio_id"]
          },
          {
            foreignKeyName: "cidades_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      condicionantes: {
        Row: {
          atualizado_em: string
          concluida_em: string | null
          concluida_por: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          notificar_dias_antes: number
          prazo: string | null
          requerimento_id: string
          responsavel_user_id: string | null
          status: Database["public"]["Enums"]["condicionante_status"]
          tenant_id: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          concluida_em?: string | null
          concluida_por?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          notificar_dias_antes?: number
          prazo?: string | null
          requerimento_id: string
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["condicionante_status"]
          tenant_id: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          concluida_em?: string | null
          concluida_por?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          notificar_dias_antes?: number
          prazo?: string | null
          requerimento_id?: string
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["condicionante_status"]
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "condicionantes_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condicionantes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          atualizado_em: string
          bucket: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          hash_sha256: string | null
          id: string
          metadata: Json
          mime: string | null
          paginas: number | null
          path: string
          requerimento_id: string | null
          status: string
          tamanho_bytes: number | null
          tenant_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          bucket?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          hash_sha256?: string | null
          id?: string
          metadata?: Json
          mime?: string | null
          paginas?: number | null
          path: string
          requerimento_id?: string | null
          status?: string
          tamanho_bytes?: number | null
          tenant_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          bucket?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          hash_sha256?: string | null
          id?: string
          metadata?: Json
          mime?: string | null
          paginas?: number | null
          path?: string
          requerimento_id?: string | null
          status?: string
          tamanho_bytes?: number | null
          tenant_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_biblioteca: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          mime_type: string | null
          nome: string
          recurso: string | null
          recurso_id: string | null
          storage_path: string
          tamanho_bytes: number | null
          tenant_id: string
          tipo: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          recurso?: string | null
          recurso_id?: string | null
          storage_path: string
          tamanho_bytes?: number | null
          tenant_id: string
          tipo?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          recurso?: string | null
          recurso_id?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
          tenant_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_biblioteca_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          codigo: string
          criado_em: string
          expira_em: string
          id: string
          usado: boolean
          user_id: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          expira_em: string
          id?: string
          usado?: boolean
          user_id: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          expira_em?: string
          id?: string
          usado?: boolean
          user_id?: string
        }
        Relationships: []
      }
      empreendimento_vinculos: {
        Row: {
          aceito_em: string | null
          ativo: boolean
          cpf: string
          criado_em: string
          criado_por: string | null
          empreendimento_id: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["vinculo_papel"]
          user_id: string | null
        }
        Insert: {
          aceito_em?: string | null
          ativo?: boolean
          cpf: string
          criado_em?: string
          criado_por?: string | null
          empreendimento_id: string
          id?: string
          nome?: string | null
          papel: Database["public"]["Enums"]["vinculo_papel"]
          user_id?: string | null
        }
        Update: {
          aceito_em?: string | null
          ativo?: boolean
          cpf?: string
          criado_em?: string
          criado_por?: string | null
          empreendimento_id?: string
          id?: string
          nome?: string | null
          papel?: Database["public"]["Enums"]["vinculo_papel"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empreendimento_vinculos_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      empreendimentos: {
        Row: {
          area_conservacao: string | null
          ativo: boolean
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cidade_id: string | null
          classe: number | null
          complemento: string | null
          consultor_user_id: string | null
          cpf_administrador: string | null
          cpf_consultor: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          municipio_id: number | null
          nome: string
          numero: string | null
          porte: Database["public"]["Enums"]["porte_empreendimento"] | null
          potencial_poluidor:
            | Database["public"]["Enums"]["potencial_poluidor"]
            | null
          telefone: string | null
          tenant_id: string
          tipo_cadastro: string | null
          tipo_imovel: string | null
          tipologia_id: string | null
          uf: string | null
          unidade_medida: string | null
          utm_easting: number | null
          utm_northing: number | null
          utm_zona: string | null
          valor_medida: number | null
        }
        Insert: {
          area_conservacao?: string | null
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade_id?: string | null
          classe?: number | null
          complemento?: string | null
          consultor_user_id?: string | null
          cpf_administrador?: string | null
          cpf_consultor?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          municipio_id?: number | null
          nome: string
          numero?: string | null
          porte?: Database["public"]["Enums"]["porte_empreendimento"] | null
          potencial_poluidor?:
            | Database["public"]["Enums"]["potencial_poluidor"]
            | null
          telefone?: string | null
          tenant_id: string
          tipo_cadastro?: string | null
          tipo_imovel?: string | null
          tipologia_id?: string | null
          uf?: string | null
          unidade_medida?: string | null
          utm_easting?: number | null
          utm_northing?: number | null
          utm_zona?: string | null
          valor_medida?: number | null
        }
        Update: {
          area_conservacao?: string | null
          ativo?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade_id?: string | null
          classe?: number | null
          complemento?: string | null
          consultor_user_id?: string | null
          cpf_administrador?: string | null
          cpf_consultor?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          municipio_id?: number | null
          nome?: string
          numero?: string | null
          porte?: Database["public"]["Enums"]["porte_empreendimento"] | null
          potencial_poluidor?:
            | Database["public"]["Enums"]["potencial_poluidor"]
            | null
          telefone?: string | null
          tenant_id?: string
          tipo_cadastro?: string | null
          tipo_imovel?: string | null
          tipologia_id?: string | null
          uf?: string | null
          unidade_medida?: string | null
          utm_easting?: number | null
          utm_northing?: number | null
          utm_zona?: string | null
          valor_medida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empreendimentos_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimentos_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_compat"
            referencedColumns: ["cidade_legacy_id"]
          },
          {
            foreignKeyName: "empreendimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimentos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "cidades_compat"
            referencedColumns: ["municipio_id"]
          },
          {
            foreignKeyName: "empreendimentos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimentos_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "cepram_tipologias"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_socios: {
        Row: {
          criado_em: string
          eh_procurador: boolean
          eh_representante_legal: boolean
          empresa_id: string
          id: string
          participacao: number | null
          pessoa_fisica_id: string
        }
        Insert: {
          criado_em?: string
          eh_procurador?: boolean
          eh_representante_legal?: boolean
          empresa_id: string
          id?: string
          participacao?: number | null
          pessoa_fisica_id: string
        }
        Update: {
          criado_em?: string
          eh_procurador?: boolean
          eh_representante_legal?: boolean
          empresa_id?: string
          id?: string
          participacao?: number | null
          pessoa_fisica_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_socios_pessoa_fisica_id_fkey"
            columns: ["pessoa_fisica_id"]
            isOneToOne: false
            referencedRelation: "pessoas_fisicas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          consultor_user_id: string | null
          criado_em: string
          criado_por: string | null
          id: string
          municipio_id: number | null
          nome_fantasia: string | null
          pessoa_juridica_id: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          consultor_user_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          municipio_id?: number | null
          nome_fantasia?: string | null
          pessoa_juridica_id: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          consultor_user_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          municipio_id?: number | null
          nome_fantasia?: string | null
          pessoa_juridica_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "cidades_compat"
            referencedColumns: ["municipio_id"]
          },
          {
            foreignKeyName: "empresas_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_pessoa_juridica_id_fkey"
            columns: ["pessoa_juridica_id"]
            isOneToOne: false
            referencedRelation: "pessoas_juridicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_features: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          geometria: Json
          id: string
          layer_id: string
          propriedades: Json
          recurso: string | null
          recurso_id: string | null
          tenant_id: string
          tipo_geom: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          geometria: Json
          id?: string
          layer_id: string
          propriedades?: Json
          recurso?: string | null
          recurso_id?: string | null
          tenant_id: string
          tipo_geom?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          geometria?: Json
          id?: string
          layer_id?: string
          propriedades?: Json
          recurso?: string | null
          recurso_id?: string | null
          tenant_id?: string
          tipo_geom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gis_features_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gis_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gis_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_layers: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          estilo: Json
          id: string
          module_key: string | null
          nome: string
          publico: boolean
          srid: number
          tenant_id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          estilo?: Json
          id?: string
          module_key?: string | null
          nome: string
          publico?: boolean
          srid?: number
          tenant_id: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          estilo?: Json
          id?: string
          module_key?: string | null
          nome?: string
          publico?: boolean
          srid?: number
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "gis_layers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      home_content: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          id: number
          slides: Json
          video_url: string | null
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          id?: number
          slides?: Json
          video_url?: string | null
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          id?: number
          slides?: Json
          video_url?: string | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          created_at: string
          feature_flags: Json
          habilitado: boolean
          id: string
          params: Json
          provider_key: string
          secret_ref: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_flags?: Json
          habilitado?: boolean
          id?: string
          params?: Json
          provider_key: string
          secret_ref?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_flags?: Json
          habilitado?: boolean
          id?: string
          params?: Json
          provider_key?: string
          secret_ref?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "integration_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          criado_em: string
          duracao_ms: number | null
          erro: string | null
          id: number
          operacao: string
          provider_key: string
          request: Json | null
          response: Json | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          id?: number
          operacao: string
          provider_key: string
          request?: Json | null
          response?: Json | null
          status: string
          tenant_id?: string | null
        }
        Update: {
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          id?: number
          operacao?: string
          provider_key?: string
          request?: Json | null
          response?: Json | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          key: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          key: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          key?: string
          nome?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          categoria: string | null
          chave: string
          core: boolean
          criado_em: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          categoria?: string | null
          chave: string
          core?: boolean
          criado_em?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          categoria?: string | null
          chave?: string
          core?: boolean
          criado_em?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      municipios: {
        Row: {
          ativo: boolean
          codigo_ibge: string
          created_at: string
          estado_nome: string
          id: number
          nome: string
          regiao: string
          uf: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_ibge: string
          created_at?: string
          estado_nome: string
          id?: number
          nome: string
          regiao: string
          uf: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_ibge?: string
          created_at?: string
          estado_nome?: string
          id?: number
          nome?: string
          regiao?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          condicionante_id: string | null
          criado_em: string
          id: string
          lida: boolean
          mensagem: string | null
          requerimento_id: string | null
          tenant_id: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          condicionante_id?: string | null
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          requerimento_id?: string | null
          tenant_id: string
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          condicionante_id?: string | null
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          requerimento_id?: string | null
          tenant_id?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_condicionante_id_fkey"
            columns: ["condicionante_id"]
            isOneToOne: false
            referencedRelation: "condicionantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      paineis: {
        Row: {
          atualizado_em: string
          cards: Json
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          cards?: Json
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          cards?: Json
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paineis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_templates: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          css: string | null
          html: string
          id: string
          nome: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          css?: string | null
          html: string
          id?: string
          nome: string
          tenant_id: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          css?: string | null
          html?: string
          id?: string
          nome?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          descricao: string
          key: string
          modulo: string
        }
        Insert: {
          descricao: string
          key: string
          modulo: string
        }
        Update: {
          descricao?: string
          key?: string
          modulo?: string
        }
        Relationships: []
      }
      pessoas_fisicas: {
        Row: {
          cpf: string
          criado_em: string
          criado_por: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          verificado: boolean
          verificado_em: string | null
        }
        Insert: {
          cpf: string
          criado_em?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          verificado?: boolean
          verificado_em?: string | null
        }
        Update: {
          cpf?: string
          criado_em?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          verificado?: boolean
          verificado_em?: string | null
        }
        Relationships: []
      }
      pessoas_juridicas: {
        Row: {
          cnpj: string
          criado_em: string
          criado_por: string | null
          email: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          verificado: boolean
          verificado_em: string | null
        }
        Insert: {
          cnpj: string
          criado_em?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          verificado?: boolean
          verificado_em?: string | null
        }
        Update: {
          cnpj?: string
          criado_em?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          verificado?: boolean
          verificado_em?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          atualizado_em: string
          cpf: string | null
          criado_em: string
          email: string
          email_validado: boolean
          id: string
          nome_completo: string
          perfil_completo: boolean
          telefone: string | null
          termos_aceitos_em: string | null
          termos_versao: string | null
          user_id: string
          verificado: boolean
          verificado_em: string | null
        }
        Insert: {
          atualizado_em?: string
          cpf?: string | null
          criado_em?: string
          email: string
          email_validado?: boolean
          id?: string
          nome_completo?: string
          perfil_completo?: boolean
          telefone?: string | null
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          user_id: string
          verificado?: boolean
          verificado_em?: string | null
        }
        Update: {
          atualizado_em?: string
          cpf?: string | null
          criado_em?: string
          email?: string
          email_validado?: boolean
          id?: string
          nome_completo?: string
          perfil_completo?: boolean
          telefone?: string | null
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          user_id?: string
          verificado?: boolean
          verificado_em?: string | null
        }
        Relationships: []
      }
      qr_tokens: {
        Row: {
          acessos: number
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          documento_id: string
          expira_em: string | null
          id: string
          revogado: boolean
          tenant_id: string
          token: string
          ultimo_acesso: string | null
        }
        Insert: {
          acessos?: number
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          documento_id: string
          expira_em?: string | null
          id?: string
          revogado?: boolean
          tenant_id: string
          token: string
          ultimo_acesso?: string | null
        }
        Update: {
          acessos?: number
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          documento_id?: string
          expira_em?: string | null
          id?: string
          revogado?: boolean
          tenant_id?: string
          token?: string
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          atualizado_em: string
          colunas: Json
          criado_em: string
          criado_por: string | null
          descricao: string | null
          entidade: string
          filtros: Json
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          colunas?: Json
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          entidade: string
          filtros?: Json
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          colunas?: Json
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          entidade?: string
          filtros?: Json
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimento_comentarios: {
        Row: {
          autor_user_id: string | null
          criado_em: string
          id: string
          requerimento_id: string
          texto: string
        }
        Insert: {
          autor_user_id?: string | null
          criado_em?: string
          id?: string
          requerimento_id: string
          texto: string
        }
        Update: {
          autor_user_id?: string | null
          criado_em?: string
          id?: string
          requerimento_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimento_comentarios_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimento_documentos: {
        Row: {
          enviado_em: string
          enviado_por: string | null
          id: string
          mime_type: string | null
          nome: string
          requerimento_id: string
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          requerimento_id: string
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          requerimento_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requerimento_documentos_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimento_status_historico: {
        Row: {
          id: string
          motivo: string | null
          mudado_em: string
          mudado_por: string | null
          requerimento_id: string
          status_anterior:
            | Database["public"]["Enums"]["requerimento_status"]
            | null
          status_novo: Database["public"]["Enums"]["requerimento_status"]
        }
        Insert: {
          id?: string
          motivo?: string | null
          mudado_em?: string
          mudado_por?: string | null
          requerimento_id: string
          status_anterior?:
            | Database["public"]["Enums"]["requerimento_status"]
            | null
          status_novo: Database["public"]["Enums"]["requerimento_status"]
        }
        Update: {
          id?: string
          motivo?: string | null
          mudado_em?: string
          mudado_por?: string | null
          requerimento_id?: string
          status_anterior?:
            | Database["public"]["Enums"]["requerimento_status"]
            | null
          status_novo?: Database["public"]["Enums"]["requerimento_status"]
        }
        Relationships: [
          {
            foreignKeyName: "requerimento_status_historico_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimento_tipo_documentos: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          tipo_id: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          tipo_id: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          tipo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimento_tipo_documentos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "requerimento_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimento_tipos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          chave: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          chave: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          chave?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimento_tipos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimentos: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          dados_dinamicos: Json
          descricao: string | null
          empreendimento_id: string
          id: string
          numero_processo: string | null
          prazo_em: string | null
          publico: boolean
          responsavel_user_id: string | null
          status: Database["public"]["Enums"]["requerimento_status"]
          tenant_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          dados_dinamicos?: Json
          descricao?: string | null
          empreendimento_id: string
          id?: string
          numero_processo?: string | null
          prazo_em?: string | null
          publico?: boolean
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["requerimento_status"]
          tenant_id: string
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          dados_dinamicos?: Json
          descricao?: string | null
          empreendimento_id?: string
          id?: string
          numero_processo?: string | null
          prazo_em?: string | null
          publico?: boolean
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["requerimento_status"]
          tenant_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "requerimentos_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
          sistema: boolean
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
          sistema?: boolean
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          sistema?: boolean
        }
        Relationships: []
      }
      telegram_bindings: {
        Row: {
          ativo: boolean
          chat_id: string
          criado_em: string
          id: string
          tenant_id: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          ativo?: boolean
          chat_id: string
          criado_em?: string
          id?: string
          tenant_id: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          ativo?: boolean
          chat_id?: string
          criado_em?: string
          id?: string
          tenant_id?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_cidades: {
        Row: {
          cidade_id: string
          criado_em: string
          tenant_id: string
        }
        Insert: {
          cidade_id: string
          criado_em?: string
          tenant_id: string
        }
        Update: {
          cidade_id?: string
          criado_em?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_cidades_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_cidades_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_compat"
            referencedColumns: ["cidade_legacy_id"]
          },
          {
            foreignKeyName: "tenant_cidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          habilitado: boolean
          habilitado_em: string
          habilitado_por: string | null
          id: string
          module_id: string
          tenant_id: string
        }
        Insert: {
          habilitado?: boolean
          habilitado_em?: string
          habilitado_por?: string | null
          id?: string
          module_id: string
          tenant_id: string
        }
        Update: {
          habilitado?: boolean
          habilitado_em?: string
          habilitado_por?: string | null
          id?: string
          module_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cnpj: string | null
          codigo_ibge: string | null
          criado_em: string
          id: string
          municipio_id: number | null
          nome: string
          nome_fantasia: string | null
          razao_social: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          slug: string
          tipo_cliente: string
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          codigo_ibge?: string | null
          criado_em?: string
          id?: string
          municipio_id?: number | null
          nome: string
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          slug: string
          tipo_cliente?: string
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          codigo_ibge?: string | null
          criado_em?: string
          id?: string
          municipio_id?: number | null
          nome?: string
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          slug?: string
          tipo_cliente?: string
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "cidades_compat"
            referencedColumns: ["municipio_id"]
          },
          {
            foreignKeyName: "tenants_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          atribuido_em: string
          atribuido_por: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          atribuido_em?: string
          atribuido_por?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          atribuido_em?: string
          atribuido_por?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cidades_compat: {
        Row: {
          cidade_legacy_id: string | null
          codigo_ibge: string | null
          municipio_id: number | null
          nome: string | null
          uf: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      api_rate_check: {
        Args: { _token_id: string; _window_seconds?: number }
        Returns: number
      }
      api_token_validate: {
        Args: { _token_hash: string }
        Returns: {
          escopos: string[]
          tenant_id: string
          token_id: string
        }[]
      }
      condicionantes_marcar_vencidas: { Args: never; Returns: number }
      consulta_publica_requerimentos: {
        Args: { _limit?: number; _municipio?: string; _q?: string }
        Returns: {
          atualizado_em: string
          empreendimento_nome: string
          empresa_nome: string
          id: string
          municipio: string
          numero_processo: string
          status: Database["public"]["Enums"]["requerimento_status"]
          tipo: string
          titulo: string
        }[]
      }
      gis_public_features: {
        Args: { _layer_id?: string }
        Returns: {
          geometria: Json
          id: string
          layer_id: string
          layer_nome: string
          propriedades: Json
        }[]
      }
      has_empreendimento_vinculo: {
        Args: { _empreendimento_id: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { _role_nome: string; _user_id: string }
        Returns: boolean
      }
      is_email_validado: { Args: { _user_id: string }; Returns: boolean }
      is_host_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      tenant_has_module: {
        Args: { _module_key: string; _tenant_id: string }
        Returns: boolean
      }
      tenant_has_permission: {
        Args: { _permission_key: string; _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      validar_qr_token: {
        Args: { _token: string }
        Returns: {
          assinaturas: Json
          documento_id: string
          emitido_em: string
          expirado: boolean
          hash_sha256: string
          revogado: boolean
          status: string
          tenant_nome: string
          tipo: string
          titulo: string
        }[]
      }
    }
    Enums: {
      condicionante_status:
        | "pendente"
        | "em_andamento"
        | "cumprida"
        | "vencida"
        | "cancelada"
      porte_empreendimento: "pequeno" | "medio" | "grande" | "excepcional"
      potencial_poluidor: "baixo" | "medio" | "alto"
      requerimento_status:
        | "rascunho"
        | "enviado"
        | "em_analise"
        | "pendente_documentos"
        | "aprovado"
        | "indeferido"
        | "arquivado"
      vinculo_papel:
        | "administrador"
        | "consultor"
        | "procurador"
        | "gerente"
        | "responsavel_tecnico"
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
      condicionante_status: [
        "pendente",
        "em_andamento",
        "cumprida",
        "vencida",
        "cancelada",
      ],
      porte_empreendimento: ["pequeno", "medio", "grande", "excepcional"],
      potencial_poluidor: ["baixo", "medio", "alto"],
      requerimento_status: [
        "rascunho",
        "enviado",
        "em_analise",
        "pendente_documentos",
        "aprovado",
        "indeferido",
        "arquivado",
      ],
      vinculo_papel: [
        "administrador",
        "consultor",
        "procurador",
        "gerente",
        "responsavel_tecnico",
      ],
    },
  },
} as const
