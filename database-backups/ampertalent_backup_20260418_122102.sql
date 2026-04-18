--
-- PostgreSQL database dump
--

\restrict hJqZaRiOoRfigUAyDpRfK4sYkzvGJPwWNpIL7SzTPOS90huk2W85I7Hf9xagiMc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6 (Homebrew)

-- Started on 2026-04-18 12:21:02 PST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_invited_by_fkey;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_invited_by_fkey;
ALTER TABLE IF EXISTS ONLY public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_external_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subscription_cancellation_logs DROP CONSTRAINT IF EXISTS subscription_cancellation_logs_subscription_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subscription_cancellation_logs DROP CONSTRAINT IF EXISTS subscription_cancellation_logs_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chats DROP CONSTRAINT IF EXISTS seeker_concierge_chats_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chats DROP CONSTRAINT IF EXISTS seeker_concierge_chats_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chats DROP CONSTRAINT IF EXISTS seeker_concierge_chats_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chat_messages DROP CONSTRAINT IF EXISTS seeker_concierge_chat_messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chat_messages DROP CONSTRAINT IF EXISTS seeker_concierge_chat_messages_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.saved_jobs DROP CONSTRAINT IF EXISTS saved_jobs_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.saved_jobs DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.resumes DROP CONSTRAINT IF EXISTS resumes_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.purchased_add_ons DROP CONSTRAINT IF EXISTS "purchased_add_ons_employerPackageId_fkey";
ALTER TABLE IF EXISTS ONLY public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_application_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_templates DROP CONSTRAINT IF EXISTS message_templates_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_drafts DROP CONSTRAINT IF EXISTS message_drafts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;
ALTER TABLE IF EXISTS ONLY public.jobs DROP CONSTRAINT IF EXISTS jobs_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.job_seekers DROP CONSTRAINT IF EXISTS job_seekers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_employer_package_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interview_history DROP CONSTRAINT IF EXISTS interview_history_application_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_invitations DROP CONSTRAINT IF EXISTS fk_user_invitation_inviter;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE IF EXISTS ONLY public.service_request_audits DROP CONSTRAINT IF EXISTS fk_service_request;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_service;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_seeker;
ALTER TABLE IF EXISTS ONLY public.resume_critiques DROP CONSTRAINT IF EXISTS fk_resume_critique_seeker;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_payment;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_employer_package;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_employer;
ALTER TABLE IF EXISTS ONLY public.service_request_audits DROP CONSTRAINT IF EXISTS fk_changed_by_user;
ALTER TABLE IF EXISTS ONLY public.cancellation_surveys DROP CONSTRAINT IF EXISTS fk_cancellation_survey_subscription;
ALTER TABLE IF EXISTS ONLY public.cancellation_surveys DROP CONSTRAINT IF EXISTS fk_cancellation_survey_seeker;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS fk_assigned_admin;
ALTER TABLE IF EXISTS ONLY public.applications DROP CONSTRAINT IF EXISTS fk_applications_resume_id;
ALTER TABLE IF EXISTS ONLY public.field_mappings DROP CONSTRAINT IF EXISTS field_mappings_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.field_mappings DROP CONSTRAINT IF EXISTS field_mappings_ghl_field_id_fkey;
ALTER TABLE IF EXISTS ONLY public.field_mappings DROP CONSTRAINT IF EXISTS field_mappings_app_field_id_fkey;
ALTER TABLE IF EXISTS ONLY public.featured_job_requests DROP CONSTRAINT IF EXISTS featured_job_requests_package_id_fkey;
ALTER TABLE IF EXISTS ONLY public.featured_job_requests DROP CONSTRAINT IF EXISTS featured_job_requests_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.featured_job_requests DROP CONSTRAINT IF EXISTS featured_job_requests_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.external_payments DROP CONSTRAINT IF EXISTS external_payments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.employers DROP CONSTRAINT IF EXISTS employers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.employers DROP CONSTRAINT IF EXISTS employers_current_package_id_fkey;
ALTER TABLE IF EXISTS ONLY public.employer_packages DROP CONSTRAINT IF EXISTS employer_packages_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.email_blast_requests DROP CONSTRAINT IF EXISTS email_blast_requests_package_id_fkey;
ALTER TABLE IF EXISTS ONLY public.email_blast_requests DROP CONSTRAINT IF EXISTS email_blast_requests_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.email_blast_requests DROP CONSTRAINT IF EXISTS email_blast_requests_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.crm_sync_settings DROP CONSTRAINT IF EXISTS crm_sync_settings_last_saved_by_fkey;
ALTER TABLE IF EXISTS ONLY public.cover_letter_templates DROP CONSTRAINT IF EXISTS cover_letter_templates_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_requests DROP CONSTRAINT IF EXISTS concierge_requests_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_requests DROP CONSTRAINT IF EXISTS concierge_requests_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_requests DROP CONSTRAINT IF EXISTS concierge_requests_assigned_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chats DROP CONSTRAINT IF EXISTS concierge_chats_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chats DROP CONSTRAINT IF EXISTS concierge_chats_employer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chats DROP CONSTRAINT IF EXISTS concierge_chats_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chat_messages DROP CONSTRAINT IF EXISTS concierge_chat_messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chat_messages DROP CONSTRAINT IF EXISTS concierge_chat_messages_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.applications DROP CONSTRAINT IF EXISTS applications_seeker_id_fkey;
ALTER TABLE IF EXISTS ONLY public.applications DROP CONSTRAINT IF EXISTS applications_job_id_fkey;
ALTER TABLE IF EXISTS ONLY public.app_fields DROP CONSTRAINT IF EXISTS app_fields_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_actions_log DROP CONSTRAINT IF EXISTS admin_actions_log_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.action_logs DROP CONSTRAINT IF EXISTS action_logs_execution_id_fkey;
ALTER TABLE IF EXISTS ONLY public."_PackageJobs" DROP CONSTRAINT IF EXISTS "_PackageJobs_B_fkey";
ALTER TABLE IF EXISTS ONLY public."_PackageJobs" DROP CONSTRAINT IF EXISTS "_PackageJobs_A_fkey";
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS protect_objects_delete ON storage.objects;
DROP TRIGGER IF EXISTS protect_buckets_delete ON storage.buckets;
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP INDEX IF EXISTS storage.vector_indexes_name_bucket_id_idx;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name_lower;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.buckets_analytics_unique_name_idx;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_action_filter_key;
DROP INDEX IF EXISTS realtime.messages_inserted_at_topic_index;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.user_profiles_stack_user_id_key;
DROP INDEX IF EXISTS public.user_profiles_legacy_id_key;
DROP INDEX IF EXISTS public.user_profiles_clerk_user_id_key;
DROP INDEX IF EXISTS public.user_profiles_clerk_user_id_idx;
DROP INDEX IF EXISTS public.team_members_user_id_idx;
DROP INDEX IF EXISTS public.team_members_employer_id_idx;
DROP INDEX IF EXISTS public.team_members_email_idx;
DROP INDEX IF EXISTS public.team_invitations_invitation_token_key;
DROP INDEX IF EXISTS public.team_invitations_employer_id_idx;
DROP INDEX IF EXISTS public.team_invitations_email_idx;
DROP INDEX IF EXISTS public.seeker_concierge_chats_seeker_id_idx;
DROP INDEX IF EXISTS public.seeker_concierge_chats_job_id_idx;
DROP INDEX IF EXISTS public.seeker_concierge_chats_admin_id_idx;
DROP INDEX IF EXISTS public.seeker_concierge_chat_messages_sender_id_idx;
DROP INDEX IF EXISTS public.seeker_concierge_chat_messages_created_at_idx;
DROP INDEX IF EXISTS public.seeker_concierge_chat_messages_chat_id_idx;
DROP INDEX IF EXISTS public.saved_jobs_seeker_id_job_id_key;
DROP INDEX IF EXISTS public.resumes_seeker_id_idx;
DROP INDEX IF EXISTS public.resumes_is_primary_idx;
DROP INDEX IF EXISTS public.pending_signups_stack_user_id_idx;
DROP INDEX IF EXISTS public.pending_signups_session_token_idx;
DROP INDEX IF EXISTS public.pending_signups_expires_at_idx;
DROP INDEX IF EXISTS public.pending_signups_email_idx;
DROP INDEX IF EXISTS public.pending_signups_clerk_user_id_idx;
DROP INDEX IF EXISTS public.pending_job_posts_stack_user_id_idx;
DROP INDEX IF EXISTS public.pending_job_posts_session_token_idx;
DROP INDEX IF EXISTS public.pending_job_posts_expires_at_idx;
DROP INDEX IF EXISTS public.pending_job_posts_email_idx;
DROP INDEX IF EXISTS public.pending_job_posts_clerk_user_id_idx;
DROP INDEX IF EXISTS public.payment_methods_seeker_id_idx;
DROP INDEX IF EXISTS public.notifications_user_id_idx;
DROP INDEX IF EXISTS public.notifications_type_idx;
DROP INDEX IF EXISTS public.notifications_read_idx;
DROP INDEX IF EXISTS public.notifications_created_at_idx;
DROP INDEX IF EXISTS public.migration_state_migration_name_key;
DROP INDEX IF EXISTS public.messages_thread_id_idx;
DROP INDEX IF EXISTS public.messages_sender_id_idx;
DROP INDEX IF EXISTS public.messages_recipient_id_idx;
DROP INDEX IF EXISTS public.messages_job_id_idx;
DROP INDEX IF EXISTS public.messages_created_at_idx;
DROP INDEX IF EXISTS public.messages_application_id_idx;
DROP INDEX IF EXISTS public.message_threads_participants_idx;
DROP INDEX IF EXISTS public.message_threads_last_message_at_idx;
DROP INDEX IF EXISTS public.message_templates_user_id_idx;
DROP INDEX IF EXISTS public.message_templates_category_idx;
DROP INDEX IF EXISTS public.message_drafts_user_id_idx;
DROP INDEX IF EXISTS public.message_drafts_thread_id_idx;
DROP INDEX IF EXISTS public.message_attachments_message_id_idx;
DROP INDEX IF EXISTS public.interview_history_created_at_idx;
DROP INDEX IF EXISTS public.interview_history_application_id_idx;
DROP INDEX IF EXISTS public.idx_user_profiles_clerk_user_id;
DROP INDEX IF EXISTS public.idx_user_invitations_token;
DROP INDEX IF EXISTS public.idx_user_invitations_email;
DROP INDEX IF EXISTS public.idx_subscriptions_tier;
DROP INDEX IF EXISTS public.idx_subscriptions_current_period;
DROP INDEX IF EXISTS public.idx_sub_cancel_logs_subscription;
DROP INDEX IF EXISTS public.idx_sub_cancel_logs_created;
DROP INDEX IF EXISTS public.idx_sub_cancel_logs_admin;
DROP INDEX IF EXISTS public.idx_service_request_audit_service_request_id;
DROP INDEX IF EXISTS public.idx_service_request_audit_created_at;
DROP INDEX IF EXISTS public.idx_service_request_audit_changed_by;
DROP INDEX IF EXISTS public.idx_resumes_seeker_id_status;
DROP INDEX IF EXISTS public.idx_resume_critiques_status;
DROP INDEX IF EXISTS public.idx_resume_critiques_seeker_id;
DROP INDEX IF EXISTS public.idx_resume_critiques_requested_at;
DROP INDEX IF EXISTS public.idx_purchased_add_ons_package_id;
DROP INDEX IF EXISTS public.idx_purchased_add_ons_add_on_id;
DROP INDEX IF EXISTS public.idx_pending_signups_clerk_user_id;
DROP INDEX IF EXISTS public.idx_pending_job_posts_clerk_user_id;
DROP INDEX IF EXISTS public.idx_migration_state_name;
DROP INDEX IF EXISTS public.idx_jobseeker_visibility_updated;
DROP INDEX IF EXISTS public.idx_jobseeker_skills_gin;
DROP INDEX IF EXISTS public.idx_jobseeker_membership;
DROP INDEX IF EXISTS public.idx_job_status_expires;
DROP INDEX IF EXISTS public.idx_job_employer_status_expires;
DROP INDEX IF EXISTS public.idx_job_employer_status;
DROP INDEX IF EXISTS public.idx_job_employer_created;
DROP INDEX IF EXISTS public.idx_job_employer_archived;
DROP INDEX IF EXISTS public.idx_job_created_at;
DROP INDEX IF EXISTS public.idx_job_category_type;
DROP INDEX IF EXISTS public.idx_execution_logs_task_name;
DROP INDEX IF EXISTS public.idx_execution_logs_status;
DROP INDEX IF EXISTS public.idx_execution_logs_created_at;
DROP INDEX IF EXISTS public.idx_employer_package_expires;
DROP INDEX IF EXISTS public.idx_cancellation_survey_subscription_id;
DROP INDEX IF EXISTS public.idx_cancellation_survey_seeker_id;
DROP INDEX IF EXISTS public.idx_cancellation_survey_reason;
DROP INDEX IF EXISTS public.idx_cancellation_survey_created_at;
DROP INDEX IF EXISTS public.idx_applications_resume_id;
DROP INDEX IF EXISTS public.idx_additional_services_user_type;
DROP INDEX IF EXISTS public.idx_additional_services_is_active;
DROP INDEX IF EXISTS public.idx_additional_service_purchases_user_id;
DROP INDEX IF EXISTS public.idx_additional_service_purchases_status;
DROP INDEX IF EXISTS public.idx_additional_service_purchases_service_id;
DROP INDEX IF EXISTS public.idx_additional_service_purchases_seeker_id;
DROP INDEX IF EXISTS public.idx_additional_service_purchases_employer_package_id;
DROP INDEX IF EXISTS public.idx_additional_service_purchases_employer_id;
DROP INDEX IF EXISTS public.idx_action_logs_status;
DROP INDEX IF EXISTS public.idx_action_logs_execution_id;
DROP INDEX IF EXISTS public.idx_action_logs_entity;
DROP INDEX IF EXISTS public.idx_action_logs_created_at;
DROP INDEX IF EXISTS public.idx_action_logs_action_type;
DROP INDEX IF EXISTS public.ghl_fields_ghl_field_key_key;
DROP INDEX IF EXISTS public.ghl_fields_ghl_field_id_key;
DROP INDEX IF EXISTS public.field_mappings_is_enabled_idx;
DROP INDEX IF EXISTS public.field_mappings_group_id_idx;
DROP INDEX IF EXISTS public.field_mappings_ghl_field_id_app_field_id_key;
DROP INDEX IF EXISTS public.featured_job_requests_status_idx;
DROP INDEX IF EXISTS public.featured_job_requests_requested_at_idx;
DROP INDEX IF EXISTS public.featured_job_requests_job_id_idx;
DROP INDEX IF EXISTS public.featured_job_requests_employer_id_idx;
DROP INDEX IF EXISTS public.external_payments_user_id_idx;
DROP INDEX IF EXISTS public.external_payments_status_idx;
DROP INDEX IF EXISTS public.external_payments_ghl_transaction_id_idx;
DROP INDEX IF EXISTS public.email_blast_requests_status_idx;
DROP INDEX IF EXISTS public.email_blast_requests_requested_at_idx;
DROP INDEX IF EXISTS public.email_blast_requests_job_id_idx;
DROP INDEX IF EXISTS public.email_blast_requests_expires_at_idx;
DROP INDEX IF EXISTS public.email_blast_requests_employer_id_idx;
DROP INDEX IF EXISTS public.crm_sync_settings_last_saved_by_key;
DROP INDEX IF EXISTS public.crm_sync_logs_status_idx;
DROP INDEX IF EXISTS public.crm_sync_logs_mapping_id_idx;
DROP INDEX IF EXISTS public.crm_sync_logs_created_at_idx;
DROP INDEX IF EXISTS public.crm_sync_change_logs_super_admin_id_idx;
DROP INDEX IF EXISTS public.crm_sync_change_logs_created_at_idx;
DROP INDEX IF EXISTS public.crm_sync_change_logs_action_type_idx;
DROP INDEX IF EXISTS public.concierge_chats_status_idx;
DROP INDEX IF EXISTS public.concierge_chats_job_id_idx;
DROP INDEX IF EXISTS public.concierge_chats_employer_id_idx;
DROP INDEX IF EXISTS public.concierge_chats_admin_id_idx;
DROP INDEX IF EXISTS public.concierge_chat_messages_sender_id_idx;
DROP INDEX IF EXISTS public.concierge_chat_messages_created_at_idx;
DROP INDEX IF EXISTS public.concierge_chat_messages_chat_id_idx;
DROP INDEX IF EXISTS public.app_fields_group_id_idx;
DROP INDEX IF EXISTS public.app_fields_field_key_key;
DROP INDEX IF EXISTS public.additional_services_service_id_key;
DROP INDEX IF EXISTS public."_PackageJobs_B_index";
DROP INDEX IF EXISTS public."_PackageJobs_AB_unique";
DROP INDEX IF EXISTS auth.webauthn_credentials_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_credentials_credential_id_key;
DROP INDEX IF EXISTS auth.webauthn_challenges_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_challenges_expires_at_idx;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_pattern_idx;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.oauth_consents_user_order_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_user_client_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_client_idx;
DROP INDEX IF EXISTS auth.oauth_clients_deleted_at_idx;
DROP INDEX IF EXISTS auth.oauth_auth_pending_exp_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_oauth_client_states_created_at;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_provider_type_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_identifier_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_enabled_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_created_at_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.buckets_vectors DROP CONSTRAINT IF EXISTS buckets_vectors_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_analytics DROP CONSTRAINT IF EXISTS buckets_analytics_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.user_invitations DROP CONSTRAINT IF EXISTS user_invitations_pkey;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_pkey;
ALTER TABLE IF EXISTS ONLY public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_pkey;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_cancellation_logs DROP CONSTRAINT IF EXISTS subscription_cancellation_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.service_request_audits DROP CONSTRAINT IF EXISTS service_request_audits_pkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chats DROP CONSTRAINT IF EXISTS seeker_concierge_chats_pkey;
ALTER TABLE IF EXISTS ONLY public.seeker_concierge_chat_messages DROP CONSTRAINT IF EXISTS seeker_concierge_chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.saved_jobs DROP CONSTRAINT IF EXISTS saved_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.resumes DROP CONSTRAINT IF EXISTS resumes_pkey;
ALTER TABLE IF EXISTS ONLY public.resume_critiques DROP CONSTRAINT IF EXISTS resume_critiques_pkey;
ALTER TABLE IF EXISTS ONLY public.purchased_add_ons DROP CONSTRAINT IF EXISTS purchased_add_ons_pkey;
ALTER TABLE IF EXISTS ONLY public.pending_signups DROP CONSTRAINT IF EXISTS pending_signups_pkey;
ALTER TABLE IF EXISTS ONLY public.pending_job_posts DROP CONSTRAINT IF EXISTS pending_job_posts_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.migration_state DROP CONSTRAINT IF EXISTS migration_state_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.message_threads DROP CONSTRAINT IF EXISTS message_threads_pkey;
ALTER TABLE IF EXISTS ONLY public.message_templates DROP CONSTRAINT IF EXISTS message_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.message_drafts DROP CONSTRAINT IF EXISTS message_drafts_pkey;
ALTER TABLE IF EXISTS ONLY public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.jobs DROP CONSTRAINT IF EXISTS jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.job_seekers DROP CONSTRAINT IF EXISTS job_seekers_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.interview_history DROP CONSTRAINT IF EXISTS interview_history_pkey;
ALTER TABLE IF EXISTS ONLY public.ghl_fields DROP CONSTRAINT IF EXISTS ghl_fields_pkey;
ALTER TABLE IF EXISTS ONLY public.field_mappings DROP CONSTRAINT IF EXISTS field_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.field_groups DROP CONSTRAINT IF EXISTS field_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.featured_job_requests DROP CONSTRAINT IF EXISTS featured_job_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.external_payments DROP CONSTRAINT IF EXISTS external_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.execution_logs DROP CONSTRAINT IF EXISTS execution_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.employers DROP CONSTRAINT IF EXISTS employers_pkey;
ALTER TABLE IF EXISTS ONLY public.employer_packages DROP CONSTRAINT IF EXISTS employer_packages_pkey;
ALTER TABLE IF EXISTS ONLY public.email_blast_requests DROP CONSTRAINT IF EXISTS email_blast_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.crm_sync_settings DROP CONSTRAINT IF EXISTS crm_sync_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.crm_sync_logs DROP CONSTRAINT IF EXISTS crm_sync_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.crm_sync_change_logs DROP CONSTRAINT IF EXISTS crm_sync_change_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.cover_letter_templates DROP CONSTRAINT IF EXISTS cover_letter_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.concierge_requests DROP CONSTRAINT IF EXISTS concierge_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chats DROP CONSTRAINT IF EXISTS concierge_chats_pkey;
ALTER TABLE IF EXISTS ONLY public.concierge_chat_messages DROP CONSTRAINT IF EXISTS concierge_chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.cancellation_surveys DROP CONSTRAINT IF EXISTS cancellation_surveys_pkey;
ALTER TABLE IF EXISTS ONLY public.applications DROP CONSTRAINT IF EXISTS applications_pkey;
ALTER TABLE IF EXISTS ONLY public.app_fields DROP CONSTRAINT IF EXISTS app_fields_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_actions_log DROP CONSTRAINT IF EXISTS admin_actions_log_pkey;
ALTER TABLE IF EXISTS ONLY public.additional_services DROP CONSTRAINT IF EXISTS additional_services_pkey;
ALTER TABLE IF EXISTS ONLY public.additional_service_purchases DROP CONSTRAINT IF EXISTS additional_service_purchases_pkey;
ALTER TABLE IF EXISTS ONLY public.action_logs DROP CONSTRAINT IF EXISTS action_logs_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_client_unique;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_clients DROP CONSTRAINT IF EXISTS oauth_clients_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_client_states DROP CONSTRAINT IF EXISTS oauth_client_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_id_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_code_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_identifier_key;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS public.migration_state ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS storage.vector_indexes;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.buckets_vectors;
DROP TABLE IF EXISTS storage.buckets_analytics;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.user_invitations;
DROP TABLE IF EXISTS public.team_members;
DROP TABLE IF EXISTS public.team_invitations;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.subscription_cancellation_logs;
DROP TABLE IF EXISTS public.service_request_audits;
DROP TABLE IF EXISTS public.seeker_concierge_chats;
DROP TABLE IF EXISTS public.seeker_concierge_chat_messages;
DROP TABLE IF EXISTS public.saved_jobs;
DROP TABLE IF EXISTS public.resumes;
DROP TABLE IF EXISTS public.resume_critiques;
DROP TABLE IF EXISTS public.purchased_add_ons;
DROP TABLE IF EXISTS public.pending_signups;
DROP TABLE IF EXISTS public.pending_job_posts;
DROP TABLE IF EXISTS public.payment_methods;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.migration_state_id_seq;
DROP TABLE IF EXISTS public.migration_state;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.message_threads;
DROP TABLE IF EXISTS public.message_templates;
DROP TABLE IF EXISTS public.message_drafts;
DROP TABLE IF EXISTS public.message_attachments;
DROP TABLE IF EXISTS public.jobs;
DROP TABLE IF EXISTS public.job_seekers;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.interview_history;
DROP TABLE IF EXISTS public.ghl_fields;
DROP TABLE IF EXISTS public.field_mappings;
DROP TABLE IF EXISTS public.field_groups;
DROP TABLE IF EXISTS public.featured_job_requests;
DROP TABLE IF EXISTS public.external_payments;
DROP TABLE IF EXISTS public.execution_logs;
DROP TABLE IF EXISTS public.employers;
DROP TABLE IF EXISTS public.employer_packages;
DROP TABLE IF EXISTS public.email_blast_requests;
DROP TABLE IF EXISTS public.crm_sync_settings;
DROP TABLE IF EXISTS public.crm_sync_logs;
DROP TABLE IF EXISTS public.crm_sync_change_logs;
DROP TABLE IF EXISTS public.cover_letter_templates;
DROP TABLE IF EXISTS public.concierge_requests;
DROP TABLE IF EXISTS public.concierge_chats;
DROP TABLE IF EXISTS public.concierge_chat_messages;
DROP TABLE IF EXISTS public.cancellation_surveys;
DROP TABLE IF EXISTS public.applications;
DROP TABLE IF EXISTS public.app_fields;
DROP TABLE IF EXISTS public.admin_actions_log;
DROP TABLE IF EXISTS public.additional_services;
DROP TABLE IF EXISTS public.additional_service_purchases;
DROP TABLE IF EXISTS public.action_logs;
DROP TABLE IF EXISTS public."_PackageJobs";
DROP TABLE IF EXISTS auth.webauthn_credentials;
DROP TABLE IF EXISTS auth.webauthn_challenges;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.oauth_consents;
DROP TABLE IF EXISTS auth.oauth_clients;
DROP TABLE IF EXISTS auth.oauth_client_states;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.custom_oauth_providers;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text);
DROP FUNCTION IF EXISTS storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text);
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.protect_delete();
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text);
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.enforce_bucket_name_length();
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS storage.allow_only_operation(expected_operation text);
DROP FUNCTION IF EXISTS storage.allow_any_operation(expected_operations text[]);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS storage.buckettype;
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS public.critique_status;
DROP TYPE IF EXISTS public.critique_priority;
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."SubscriptionStatus";
DROP TYPE IF EXISTS public."SeekerInterviewStatus";
DROP TYPE IF EXISTS public."ProfileVisibility";
DROP TYPE IF EXISTS public."PackageType";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."NotificationPriority";
DROP TYPE IF EXISTS public."MembershipPlan";
DROP TYPE IF EXISTS public."JobType";
DROP TYPE IF EXISTS public."JobStatus";
DROP TYPE IF EXISTS public."JobCategory";
DROP TYPE IF EXISTS public."InvoiceStatus";
DROP TYPE IF EXISTS public."InterviewStage";
DROP TYPE IF EXISTS public."FeaturedStatus";
DROP TYPE IF EXISTS public."ExternalPaymentStatus";
DROP TYPE IF EXISTS public."EmailBlastStatus";
DROP TYPE IF EXISTS public."CritiqueStatus";
DROP TYPE IF EXISTS public."ConciergeStatus";
DROP TYPE IF EXISTS public."ApplicationStatus";
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.oauth_response_type;
DROP TYPE IF EXISTS auth.oauth_registration_type;
DROP TYPE IF EXISTS auth.oauth_client_type;
DROP TYPE IF EXISTS auth.oauth_authorization_status;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP EXTENSION IF EXISTS pg_graphql;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
--
-- TOC entry 34 (class 2615 OID 16498)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- TOC entry 20 (class 2615 OID 16392)
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- TOC entry 32 (class 2615 OID 16578)
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- TOC entry 31 (class 2615 OID 16567)
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- TOC entry 12 (class 2615 OID 16390)
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- TOC entry 11 (class 2615 OID 16559)
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- TOC entry 35 (class 2615 OID 16546)
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- TOC entry 29 (class 2615 OID 16607)
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- TOC entry 6 (class 3079 OID 16643)
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 6
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- TOC entry 2 (class 3079 OID 16393)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 4 (class 3079 OID 16447)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 5 (class 3079 OID 16608)
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 5
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- TOC entry 3 (class 3079 OID 16436)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 1175 (class 1247 OID 16738)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- TOC entry 1199 (class 1247 OID 16879)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- TOC entry 1172 (class 1247 OID 16732)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- TOC entry 1169 (class 1247 OID 16727)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- TOC entry 1217 (class 1247 OID 16982)
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- TOC entry 1229 (class 1247 OID 17055)
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- TOC entry 1211 (class 1247 OID 16960)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- TOC entry 1220 (class 1247 OID 16992)
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- TOC entry 1205 (class 1247 OID 16921)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- TOC entry 1292 (class 1247 OID 18760)
-- Name: ApplicationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApplicationStatus" AS ENUM (
    'pending',
    'reviewed',
    'interview',
    'rejected',
    'hired'
);


--
-- TOC entry 1319 (class 1247 OID 18792)
-- Name: ConciergeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConciergeStatus" AS ENUM (
    'not_requested',
    'pending',
    'completed'
);


--
-- TOC entry 1322 (class 1247 OID 18800)
-- Name: CritiqueStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CritiqueStatus" AS ENUM (
    'pending',
    'completed'
);


--
-- TOC entry 1343 (class 1247 OID 19000)
-- Name: EmailBlastStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmailBlastStatus" AS ENUM (
    'not_requested',
    'not_started',
    'pending',
    'completed'
);


--
-- TOC entry 1337 (class 1247 OID 18978)
-- Name: ExternalPaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExternalPaymentStatus" AS ENUM (
    'pending',
    'completed',
    'failed',
    'requires_review',
    'refunded'
);


--
-- TOC entry 1340 (class 1247 OID 18990)
-- Name: FeaturedStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeaturedStatus" AS ENUM (
    'not_requested',
    'not_started',
    'pending',
    'completed'
);


--
-- TOC entry 1346 (class 1247 OID 19010)
-- Name: InterviewStage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InterviewStage" AS ENUM (
    'initial_screening',
    'technical_interview',
    'behavioral_interview',
    'final_interview',
    'offer_extended',
    'offer_accepted',
    'offer_rejected'
);


--
-- TOC entry 1298 (class 1247 OID 18782)
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'draft',
    'open',
    'paid',
    'void'
);


--
-- TOC entry 1325 (class 1247 OID 18806)
-- Name: JobCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobCategory" AS ENUM (
    'ACCOUNTING_BOOKKEEPING',
    'ADMINISTRATION_VIRTUAL_ASSISTANT',
    'ADVERTISING',
    'BLOGGER',
    'BUSINESS_DEVELOPMENT',
    'COMPUTER_IT',
    'CONSULTANT',
    'CUSTOMER_SERVICE',
    'DATABASE_DEVELOPMENT',
    'DESIGN',
    'FINANCE',
    'GRAPHIC_DESIGN_ARTIST',
    'HUMAN_RESOURCES',
    'INTERNET_MARKETING_SPECIALIST',
    'MANAGER',
    'MARKETING_PUBLIC_RELATIONS',
    'MEDIA_SPECIALIST',
    'OTHER',
    'PARALEGAL_LEGAL',
    'PROGRAMMER',
    'RESEARCHER',
    'SALES',
    'SOCIAL_MEDIA',
    'STRATEGIC_PLANNER',
    'VIDEO_PRODUCTION_EDITING',
    'WEB_DESIGN_DEVELOPMENT',
    'WEBSITE_MANAGER',
    'WRITING_EDITING'
);


--
-- TOC entry 1316 (class 1247 OID 18746)
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobStatus" AS ENUM (
    'draft',
    'pending_vetting',
    'approved',
    'paused',
    'rejected',
    'expired'
);


--
-- TOC entry 1313 (class 1247 OID 18734)
-- Name: JobType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobType" AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'PERMANENT',
    'TEMPORARY',
    'NOT_SPECIFIED'
);


--
-- TOC entry 1307 (class 1247 OID 18682)
-- Name: MembershipPlan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipPlan" AS ENUM (
    'none',
    'trial_monthly',
    'gold_bimonthly',
    'vip_quarterly',
    'annual_platinum'
);


--
-- TOC entry 1331 (class 1247 OID 18962)
-- Name: NotificationPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationPriority" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- TOC entry 1328 (class 1247 OID 18864)
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'job_submitted',
    'job_approved',
    'job_rejected',
    'job_under_review',
    'new_application',
    'application_status_update',
    'low_credits',
    'job_expiring',
    'system_alert',
    'job_invitation',
    'seeker_welcome',
    'seeker_payment_confirmation',
    'seeker_subscription_reminder',
    'seeker_pre_signup',
    'employer_welcome',
    'employer_payment_confirmation',
    'employer_invitation_accepted',
    'employer_job_filled',
    'system_error',
    'processing_error',
    'bulk_rejection',
    'bulk_interview',
    'job_archived',
    'job_restored',
    'interview_scheduled',
    'interview_completed',
    'interview_stage_changed',
    'offer_extended',
    'offer_accepted',
    'offer_rejected',
    'admin_role_promoted',
    'admin_role_demoted',
    'service_purchase_confirmation',
    'service_status_update',
    'service_completed',
    'service_admin_alert',
    'exclusive_plan_offered',
    'exclusive_plan_activated',
    'exclusive_plan_dismissed',
    'exclusive_plan_reminder',
    'exclusive_plan_expired',
    'exclusive_plan_extended',
    'exclusive_plan_cancelled',
    'exclusive_plan_admin_alert',
    'exclusive_plan_extension_requested',
    'exclusive_plan_extension_approved',
    'exclusive_plan_extension_rejected',
    'follow_up_request'
);


--
-- TOC entry 1310 (class 1247 OID 18694)
-- Name: PackageType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PackageType" AS ENUM (
    'starter',
    'professional',
    'enterprise',
    'unlimited',
    'standard',
    'featured',
    'email_blast',
    'gold_plus',
    'standard_job_post',
    'featured_job_post',
    'solo_email_blast',
    'gold_plus_6_month',
    'concierge_lite',
    'concierge_level_1',
    'concierge_level_2',
    'rush_service',
    'onboarding_service',
    'concierge_level_3',
    'gold_plus_recurring_6mo'
);


--
-- TOC entry 1334 (class 1247 OID 18972)
-- Name: ProfileVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileVisibility" AS ENUM (
    'employers_only',
    'private'
);


--
-- TOC entry 1349 (class 1247 OID 19026)
-- Name: SeekerInterviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SeekerInterviewStatus" AS ENUM (
    'application_review',
    'interview_process',
    'decision_made'
);


--
-- TOC entry 1295 (class 1247 OID 18772)
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'active',
    'past_due',
    'canceled',
    'unpaid'
);


--
-- TOC entry 1304 (class 1247 OID 18671)
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'seeker',
    'employer',
    'admin',
    'team_member',
    'super_admin'
);


--
-- TOC entry 1352 (class 1247 OID 19034)
-- Name: critique_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.critique_priority AS ENUM (
    'standard',
    'rush'
);


--
-- TOC entry 1355 (class 1247 OID 19040)
-- Name: critique_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.critique_status AS ENUM (
    'pending',
    'in_progress',
    'completed'
);


--
-- TOC entry 1256 (class 1247 OID 17206)
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- TOC entry 1247 (class 1247 OID 17166)
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- TOC entry 1250 (class 1247 OID 17181)
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- TOC entry 1262 (class 1247 OID 17250)
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- TOC entry 1259 (class 1247 OID 17219)
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- TOC entry 1280 (class 1247 OID 17396)
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- TOC entry 474 (class 1255 OID 16544)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- TOC entry 5029 (class 0 OID 0)
-- Dependencies: 474
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- TOC entry 493 (class 1255 OID 16709)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- TOC entry 473 (class 1255 OID 16543)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- TOC entry 5030 (class 0 OID 0)
-- Dependencies: 473
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- TOC entry 472 (class 1255 OID 16542)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- TOC entry 5031 (class 0 OID 0)
-- Dependencies: 472
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- TOC entry 475 (class 1255 OID 16551)
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- TOC entry 5032 (class 0 OID 0)
-- Dependencies: 475
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- TOC entry 479 (class 1255 OID 16572)
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- TOC entry 5033 (class 0 OID 0)
-- Dependencies: 479
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- TOC entry 476 (class 1255 OID 16553)
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- TOC entry 5034 (class 0 OID 0)
-- Dependencies: 476
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- TOC entry 477 (class 1255 OID 16563)
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- TOC entry 478 (class 1255 OID 16564)
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- TOC entry 480 (class 1255 OID 16574)
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- TOC entry 5035 (class 0 OID 0)
-- Dependencies: 480
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- TOC entry 422 (class 1255 OID 16391)
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- TOC entry 499 (class 1255 OID 17243)
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- TOC entry 519 (class 1255 OID 17511)
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- TOC entry 501 (class 1255 OID 17255)
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- TOC entry 497 (class 1255 OID 17203)
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- TOC entry 496 (class 1255 OID 17198)
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- TOC entry 500 (class 1255 OID 17251)
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- TOC entry 522 (class 1255 OID 18657)
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- TOC entry 495 (class 1255 OID 17197)
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- TOC entry 518 (class 1255 OID 17510)
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- TOC entry 494 (class 1255 OID 17195)
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- TOC entry 498 (class 1255 OID 17232)
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- TOC entry 517 (class 1255 OID 17504)
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- TOC entry 521 (class 1255 OID 18653)
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- TOC entry 520 (class 1255 OID 18652)
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- TOC entry 508 (class 1255 OID 17337)
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- TOC entry 511 (class 1255 OID 17393)
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- TOC entry 504 (class 1255 OID 17312)
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- TOC entry 503 (class 1255 OID 17311)
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- TOC entry 502 (class 1255 OID 17310)
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- TOC entry 512 (class 1255 OID 17450)
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- TOC entry 505 (class 1255 OID 17324)
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- TOC entry 509 (class 1255 OID 17376)
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- TOC entry 513 (class 1255 OID 17451)
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- TOC entry 510 (class 1255 OID 17392)
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- TOC entry 516 (class 1255 OID 17457)
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- TOC entry 506 (class 1255 OID 17326)
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- TOC entry 515 (class 1255 OID 17455)
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- TOC entry 514 (class 1255 OID 17454)
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- TOC entry 507 (class 1255 OID 17327)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 320 (class 1259 OID 16529)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- TOC entry 5036 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 340 (class 1259 OID 17078)
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- TOC entry 334 (class 1259 OID 16883)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- TOC entry 5037 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- TOC entry 325 (class 1259 OID 16681)
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- TOC entry 5038 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 5039 (class 0 OID 0)
-- Dependencies: 325
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 319 (class 1259 OID 16522)
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- TOC entry 5040 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 329 (class 1259 OID 16770)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- TOC entry 5041 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 328 (class 1259 OID 16758)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- TOC entry 5042 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 327 (class 1259 OID 16745)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- TOC entry 5043 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- TOC entry 5044 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- TOC entry 337 (class 1259 OID 16995)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- TOC entry 339 (class 1259 OID 17068)
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- TOC entry 5045 (class 0 OID 0)
-- Dependencies: 339
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- TOC entry 336 (class 1259 OID 16965)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- TOC entry 338 (class 1259 OID 17028)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- TOC entry 335 (class 1259 OID 16933)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- TOC entry 318 (class 1259 OID 16511)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- TOC entry 5046 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 317 (class 1259 OID 16510)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5047 (class 0 OID 0)
-- Dependencies: 317
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 332 (class 1259 OID 16812)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 333 (class 1259 OID 16830)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 321 (class 1259 OID 16537)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 326 (class 1259 OID 16711)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 326
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 326
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- TOC entry 5054 (class 0 OID 0)
-- Dependencies: 326
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- TOC entry 331 (class 1259 OID 16797)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- TOC entry 5055 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 330 (class 1259 OID 16788)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- TOC entry 5056 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 5057 (class 0 OID 0)
-- Dependencies: 330
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 316 (class 1259 OID 16499)
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 316
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 342 (class 1259 OID 17143)
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- TOC entry 341 (class 1259 OID 17120)
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- TOC entry 409 (class 1259 OID 19575)
-- Name: _PackageJobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_PackageJobs" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- TOC entry 408 (class 1259 OID 19566)
-- Name: action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_logs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    execution_id text,
    action_type text NOT NULL,
    entity_type text,
    entity_id text,
    status text NOT NULL,
    message text,
    details text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 394 (class 1259 OID 19431)
-- Name: additional_service_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_service_purchases (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    service_id text NOT NULL,
    user_id text NOT NULL,
    seeker_id text,
    employer_id text,
    payment_id text,
    amount_paid numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    assigned_admin_id text,
    fulfillment_notes text,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    employer_package_id text
);


--
-- TOC entry 395 (class 1259 OID 19442)
-- Name: additional_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_services (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    service_id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    category text NOT NULL,
    user_type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    features text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 371 (class 1259 OID 19217)
-- Name: admin_actions_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_actions_log (
    id text NOT NULL,
    admin_id text NOT NULL,
    action_type text NOT NULL,
    target_entity text NOT NULL,
    target_id text NOT NULL,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 403 (class 1259 OID 19517)
-- Name: app_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_fields (
    id text NOT NULL,
    field_key text NOT NULL,
    name text NOT NULL,
    data_type text NOT NULL,
    model_name text,
    is_system_field boolean DEFAULT false NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    description text,
    group_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 363 (class 1259 OID 19135)
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id text NOT NULL,
    job_id text NOT NULL,
    seeker_id text NOT NULL,
    resume_url text NOT NULL,
    cover_letter text,
    status public."ApplicationStatus" DEFAULT 'pending'::public."ApplicationStatus" NOT NULL,
    applied_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    interview_completed_at timestamp(6) with time zone,
    interview_scheduled_at timestamp(6) with time zone,
    interview_stage public."InterviewStage",
    interviewer_notes text,
    next_action_deadline timestamp(6) with time zone,
    next_action_required text,
    resume_id character varying(255),
    legacy_id bigint
);


--
-- TOC entry 366 (class 1259 OID 19166)
-- Name: cancellation_surveys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancellation_surveys (
    id text NOT NULL,
    seeker_id text NOT NULL,
    subscription_id text,
    primary_reason text NOT NULL,
    reason_other_text text,
    job_satisfaction text NOT NULL,
    overall_experience text NOT NULL,
    improvement_feedback text,
    recommend_to_others text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 374 (class 1259 OID 19243)
-- Name: concierge_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concierge_chat_messages (
    id text NOT NULL,
    chat_id text NOT NULL,
    sender_id text NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    file_url text,
    file_name text,
    file_size integer,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 373 (class 1259 OID 19234)
-- Name: concierge_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concierge_chats (
    id text NOT NULL,
    job_id text NOT NULL,
    employer_id text NOT NULL,
    admin_id text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 372 (class 1259 OID 19225)
-- Name: concierge_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concierge_requests (
    id text NOT NULL,
    job_id text NOT NULL,
    employer_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    assigned_admin_id text,
    discovery_call_notes text,
    optimized_job_description text,
    shortlisted_candidates jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 378 (class 1259 OID 19277)
-- Name: cover_letter_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cover_letter_templates (
    id text NOT NULL,
    seeker_id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 400 (class 1259 OID 19485)
-- Name: crm_sync_change_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_sync_change_logs (
    id text NOT NULL,
    super_admin_id text NOT NULL,
    super_admin_name text NOT NULL,
    action_type text NOT NULL,
    action_details jsonb NOT NULL,
    entity_type text,
    entity_id text,
    old_value jsonb,
    new_value jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 406 (class 1259 OID 19546)
-- Name: crm_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_sync_logs (
    id text NOT NULL,
    mapping_id text NOT NULL,
    user_id text,
    direction text NOT NULL,
    status text NOT NULL,
    error_message text,
    data_snapshot jsonb,
    duration_ms integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 401 (class 1259 OID 19493)
-- Name: crm_sync_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_sync_settings (
    id text NOT NULL,
    is_global_sync_enabled boolean DEFAULT true NOT NULL,
    default_sync_direction text DEFAULT 'app_to_ghl'::text NOT NULL,
    sync_on_create boolean DEFAULT true NOT NULL,
    sync_on_update boolean DEFAULT true NOT NULL,
    sync_batch_size integer DEFAULT 50 NOT NULL,
    retry_attempts integer DEFAULT 3 NOT NULL,
    retry_delay_seconds integer DEFAULT 60 NOT NULL,
    ghl_api_key text,
    ghl_location_id text,
    ghl_connection_status text DEFAULT 'disconnected'::text NOT NULL,
    ghl_last_tested timestamp(3) without time zone,
    ghl_last_tested_by text,
    last_updated_by text NOT NULL,
    last_saved_by text,
    last_saved_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 387 (class 1259 OID 19361)
-- Name: email_blast_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_blast_requests (
    id text NOT NULL,
    job_id text NOT NULL,
    employer_id text NOT NULL,
    package_id text NOT NULL,
    status public."EmailBlastStatus" DEFAULT 'not_started'::public."EmailBlastStatus" NOT NULL,
    admin_notes text,
    requested_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    email_sent_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone NOT NULL,
    logo_url text,
    content text,
    custom_link text,
    use_job_link boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 361 (class 1259 OID 19097)
-- Name: employer_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employer_packages (
    id text NOT NULL,
    employer_id text NOT NULL,
    job_ids text[],
    listings_remaining integer NOT NULL,
    purchased_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    package_type public."PackageType" NOT NULL,
    featured_listings_remaining integer DEFAULT 0 NOT NULL,
    featured_listings_used integer DEFAULT 0 NOT NULL,
    is_recurring boolean DEFAULT false,
    billing_frequency text,
    billing_cycles_total integer,
    billing_cycles_completed integer DEFAULT 0,
    next_billing_date timestamp(6) with time zone,
    recurring_amount_cents integer,
    arb_subscription_id character varying(255),
    recurring_status text DEFAULT 'active'::text,
    extension_requested_at timestamp(6) with time zone,
    extension_requested_months integer,
    extension_request_status text,
    extension_reviewed_at timestamp(6) with time zone,
    extension_reviewed_by text
);


--
-- TOC entry 360 (class 1259 OID 19087)
-- Name: employers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employers (
    user_id text NOT NULL,
    company_name text NOT NULL,
    company_website text,
    company_logo_url text,
    company_description text,
    billing_address text,
    tax_id text,
    current_package_id text,
    is_suspended boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_vetted boolean DEFAULT false NOT NULL,
    vetted_at timestamp(3) without time zone,
    vetted_by text,
    team_id text,
    mission_statement text,
    core_values text,
    exclusive_plan_type text,
    exclusive_plan_name text,
    exclusive_plan_amount_cents integer,
    exclusive_plan_cycles integer,
    exclusive_plan_offered_at timestamp(6) with time zone,
    exclusive_plan_dismissed_at timestamp(6) with time zone,
    exclusive_plan_activated_at timestamp(6) with time zone,
    exclusive_plan_source text
);


--
-- TOC entry 407 (class 1259 OID 19554)
-- Name: execution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.execution_logs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    task_name text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    started_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(6) with time zone,
    duration_ms integer,
    summary text,
    log_output text,
    triggered_by text DEFAULT 'system'::text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 384 (class 1259 OID 19334)
-- Name: external_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_payments (
    id text NOT NULL,
    user_id text,
    ghl_transaction_id text,
    authnet_transaction_id text,
    authnet_customer_id text,
    amount numeric(65,30) NOT NULL,
    plan_id text NOT NULL,
    status public."ExternalPaymentStatus" NOT NULL,
    error_message text,
    webhook_processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 386 (class 1259 OID 19350)
-- Name: featured_job_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_job_requests (
    id text NOT NULL,
    job_id text NOT NULL,
    employer_id text NOT NULL,
    package_id text NOT NULL,
    status public."FeaturedStatus" DEFAULT 'not_started'::public."FeaturedStatus" NOT NULL,
    admin_notes text,
    requested_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    email_sent_at timestamp(3) without time zone,
    extension_granted boolean DEFAULT false NOT NULL,
    extension_expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 404 (class 1259 OID 19527)
-- Name: field_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_groups (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 405 (class 1259 OID 19536)
-- Name: field_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_mappings (
    id text NOT NULL,
    group_id text,
    ghl_field_id text NOT NULL,
    app_field_id text NOT NULL,
    sync_direction text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    display_label text,
    transform_rules jsonb,
    created_by text NOT NULL,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_synced_at timestamp(3) without time zone,
    last_sync_status text,
    last_sync_error text,
    is_auto_generated boolean DEFAULT false NOT NULL
);


--
-- TOC entry 402 (class 1259 OID 19508)
-- Name: ghl_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ghl_fields (
    id text NOT NULL,
    ghl_field_id text NOT NULL,
    ghl_field_key text NOT NULL,
    name text NOT NULL,
    data_type text NOT NULL,
    picklist_options jsonb,
    is_system_field boolean DEFAULT false NOT NULL,
    last_synced_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 364 (class 1259 OID 19144)
-- Name: interview_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_history (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    application_id text NOT NULL,
    stage public."InterviewStage" NOT NULL,
    scheduled_at timestamp(6) with time zone,
    completed_at timestamp(6) with time zone,
    notes text,
    interviewer_id text,
    feedback text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 369 (class 1259 OID 19197)
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    employer_package_id text NOT NULL,
    authnet_transaction_id text,
    amount_due integer NOT NULL,
    status public."InvoiceStatus" DEFAULT 'draft'::public."InvoiceStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    description text,
    package_name text,
    due_date timestamp(3) without time zone,
    paid_at timestamp(3) without time zone
);


--
-- TOC entry 359 (class 1259 OID 19062)
-- Name: job_seekers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_seekers (
    user_id text NOT NULL,
    headline text,
    about_me text,
    availability text,
    skills text[],
    portfolio_urls text[],
    resume_url text,
    resume_last_uploaded timestamp(3) without time zone,
    membership_plan public."MembershipPlan" DEFAULT 'none'::public."MembershipPlan" NOT NULL,
    membership_expires_at timestamp(3) without time zone,
    is_suspended boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    resume_credits integer DEFAULT 0 NOT NULL,
    salary_expectations text,
    allow_direct_messages boolean DEFAULT true NOT NULL,
    application_updates boolean DEFAULT true NOT NULL,
    email_alerts boolean DEFAULT true NOT NULL,
    job_recommendations boolean DEFAULT true NOT NULL,
    profile_visibility public."ProfileVisibility" DEFAULT 'employers_only'::public."ProfileVisibility" NOT NULL,
    show_salary_expectations boolean DEFAULT true NOT NULL,
    weekly_digest boolean DEFAULT false NOT NULL,
    allow_job_invitations boolean DEFAULT true NOT NULL,
    resume_limit integer DEFAULT 0 NOT NULL,
    resumes_used integer DEFAULT 0 NOT NULL,
    trial_ends_at timestamp(3) without time zone,
    is_on_trial boolean DEFAULT false NOT NULL,
    cancelled_seeker boolean DEFAULT false NOT NULL,
    cancelled_at timestamp(3) without time zone,
    has_previous_subscription boolean DEFAULT false NOT NULL,
    education jsonb,
    work_experience text,
    professional_summary text,
    resume_carryover_count integer DEFAULT 0 NOT NULL,
    last_billing_period_start timestamp(6) without time zone
);


--
-- TOC entry 362 (class 1259 OID 19111)
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id text NOT NULL,
    employer_id text NOT NULL,
    title text NOT NULL,
    pay_range_min numeric(65,30),
    pay_range_max numeric(65,30),
    pay_range_text text,
    type public."JobType" NOT NULL,
    description text NOT NULL,
    skills_required text[],
    is_flexible_hours boolean DEFAULT false NOT NULL,
    hours_per_week integer,
    remote_schedule text,
    location_text text,
    status public."JobStatus" DEFAULT 'draft'::public."JobStatus" NOT NULL,
    rejection_reason text,
    concierge_requested boolean DEFAULT false NOT NULL,
    concierge_status public."ConciergeStatus" DEFAULT 'not_requested'::public."ConciergeStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    expires_at timestamp(3) without time zone,
    approved_at timestamp(3) without time zone,
    benefits text,
    views_count integer DEFAULT 0 NOT NULL,
    salary_type text,
    experience_level text,
    application_deadline timestamp(3) without time zone,
    requirements text,
    contact_phone text,
    linkedin_profile text,
    website text,
    category public."JobCategory" NOT NULL,
    email_blast_completed_at timestamp(3) without time zone,
    email_blast_expires_at timestamp(3) without time zone,
    email_blast_requested_at timestamp(3) without time zone,
    email_blast_status public."EmailBlastStatus" DEFAULT 'not_requested'::public."EmailBlastStatus" NOT NULL,
    featured_completed_at timestamp(3) without time zone,
    featured_extension_expires_at timestamp(3) without time zone,
    featured_extension_granted boolean DEFAULT false NOT NULL,
    featured_requested_at timestamp(3) without time zone,
    featured_status public."FeaturedStatus" DEFAULT 'not_requested'::public."FeaturedStatus" NOT NULL,
    is_email_blast boolean DEFAULT false NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_company_private boolean DEFAULT false NOT NULL,
    applicants_visible_to_employer boolean DEFAULT false NOT NULL,
    applicants_visible_last_toggled timestamp(3) without time zone,
    applicants_visible_toggled_by text,
    chat_enabled boolean DEFAULT false NOT NULL,
    chat_enabled_at timestamp(3) without time zone,
    archived_at timestamp(6) with time zone,
    archived_by text,
    is_archived boolean DEFAULT false,
    is_paused boolean DEFAULT false NOT NULL,
    paused_at timestamp(3) without time zone,
    paused_by character varying(255),
    paused_days_remaining integer,
    resumed_at timestamp(3) without time zone,
    legacy_id bigint,
    manual_approve boolean DEFAULT false NOT NULL
);


--
-- TOC entry 390 (class 1259 OID 19394)
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_attachments (
    id text NOT NULL,
    message_id text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    mime_type text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 393 (class 1259 OID 19423)
-- Name: message_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_drafts (
    id text NOT NULL,
    user_id text NOT NULL,
    recipient_id text,
    thread_id text,
    content text NOT NULL,
    attachments jsonb,
    last_saved_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 392 (class 1259 OID 19412)
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 391 (class 1259 OID 19402)
-- Name: message_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_threads (
    id text NOT NULL,
    participants text[],
    last_message_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    legacy_id double precision
);


--
-- TOC entry 389 (class 1259 OID 19383)
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id text NOT NULL,
    sender_id text NOT NULL,
    recipient_id text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    delivery_status text DEFAULT 'sent'::text NOT NULL,
    application_id text,
    job_id text,
    thread_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    legacy_id double precision
);


--
-- TOC entry 399 (class 1259 OID 19473)
-- Name: migration_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_state (
    id integer NOT NULL,
    migration_name text NOT NULL,
    last_migrated_id bigint DEFAULT 0 NOT NULL,
    last_migrated_at timestamp(6) without time zone,
    total_migrated integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 398 (class 1259 OID 19472)
-- Name: migration_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migration_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 398
-- Name: migration_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_state_id_seq OWNED BY public.migration_state.id;


--
-- TOC entry 382 (class 1259 OID 19316)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false NOT NULL,
    priority public."NotificationPriority" DEFAULT 'medium'::public."NotificationPriority" NOT NULL,
    action_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp(3) without time zone
);


--
-- TOC entry 370 (class 1259 OID 19206)
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id text NOT NULL,
    employer_id text,
    seeker_id text,
    type text DEFAULT 'card'::text NOT NULL,
    last4 text NOT NULL,
    brand text NOT NULL,
    expiry_month integer NOT NULL,
    expiry_year integer NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    authnet_payment_profile_id text,
    billing_first_name text,
    billing_last_name text,
    billing_address text,
    billing_city text,
    billing_state text,
    billing_zip_code text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_legacy boolean DEFAULT false
);


--
-- TOC entry 385 (class 1259 OID 19342)
-- Name: pending_job_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_job_posts (
    id text NOT NULL,
    stack_user_id text,
    email text NOT NULL,
    job_data text NOT NULL,
    selected_package text,
    session_token text NOT NULL,
    return_url text NOT NULL,
    checkout_session_id text,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    clerk_user_id text
);


--
-- TOC entry 383 (class 1259 OID 19326)
-- Name: pending_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_signups (
    id text NOT NULL,
    stack_user_id text,
    onboarding_data text NOT NULL,
    selected_plan text NOT NULL,
    session_token text NOT NULL,
    return_url text NOT NULL,
    checkout_session_id text,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    email text NOT NULL,
    clerk_user_id text
);


--
-- TOC entry 397 (class 1259 OID 19463)
-- Name: purchased_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchased_add_ons (
    id text NOT NULL,
    "employerPackageId" text NOT NULL,
    "addOnId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    price double precision NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 368 (class 1259 OID 19184)
-- Name: resume_critiques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_critiques (
    id character varying(255) DEFAULT gen_random_uuid() NOT NULL,
    seeker_id character varying(255) NOT NULL,
    requested_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resume_url text NOT NULL,
    analysis jsonb,
    completed_at timestamp(6) with time zone,
    cost double precision NOT NULL,
    priority public.critique_priority DEFAULT 'standard'::public.critique_priority NOT NULL,
    reviewer_id character varying(255),
    target_industry character varying(255),
    target_role character varying(255),
    status public.critique_status DEFAULT 'pending'::public.critique_status NOT NULL
);


--
-- TOC entry 388 (class 1259 OID 19372)
-- Name: resumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resumes (
    id text NOT NULL,
    seeker_id text NOT NULL,
    filename text NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    is_primary boolean DEFAULT false NOT NULL,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    deleted_at timestamp(6) without time zone
);


--
-- TOC entry 377 (class 1259 OID 19269)
-- Name: saved_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_jobs (
    id text NOT NULL,
    seeker_id text NOT NULL,
    job_id text NOT NULL,
    saved_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 376 (class 1259 OID 19260)
-- Name: seeker_concierge_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seeker_concierge_chat_messages (
    id text NOT NULL,
    chat_id text NOT NULL,
    sender_id text NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    file_url text,
    file_name text,
    file_size integer,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 375 (class 1259 OID 19252)
-- Name: seeker_concierge_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seeker_concierge_chats (
    id text NOT NULL,
    job_id text NOT NULL,
    seeker_id text NOT NULL,
    admin_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 396 (class 1259 OID 19454)
-- Name: service_request_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_request_audits (
    service_request_id text NOT NULL,
    changed_by text NOT NULL,
    change_type text NOT NULL,
    previous_value text,
    new_value text,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id text DEFAULT (gen_random_uuid())::text NOT NULL
);


--
-- TOC entry 367 (class 1259 OID 19175)
-- Name: subscription_cancellation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_cancellation_logs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    subscription_id text NOT NULL,
    admin_id text NOT NULL,
    seeker_id text NOT NULL,
    previous_period_end timestamp(6) with time zone,
    new_period_end timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 365 (class 1259 OID 19154)
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    seeker_id text NOT NULL,
    authnet_subscription_id text,
    authnet_customer_id text,
    plan public."MembershipPlan" NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'active'::public."SubscriptionStatus" NOT NULL,
    current_period_end timestamp(3) without time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    ghl_transaction_id text,
    external_payment_id text,
    tier character varying(50),
    tier_metadata jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp(6) with time zone,
    is_legacy_beta boolean DEFAULT false,
    current_period_start timestamp(6) without time zone,
    billing_frequency character varying(50),
    next_billing_date timestamp(6) without time zone,
    legacy_id double precision
);


--
-- TOC entry 381 (class 1259 OID 19307)
-- Name: team_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invitations (
    id text NOT NULL,
    employer_id text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    invited_by text NOT NULL,
    invitation_token text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    accepted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    message text,
    clerk_invitation_id character varying(255)
);


--
-- TOC entry 379 (class 1259 OID 19286)
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id text NOT NULL,
    employer_id text NOT NULL,
    user_id text,
    email text NOT NULL,
    name text,
    role text DEFAULT 'member'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by text NOT NULL,
    invited_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    joined_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- TOC entry 380 (class 1259 OID 19297)
-- Name: user_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_invitations (
    id character varying(255) DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    full_name character varying(255),
    invited_by character varying(255) NOT NULL,
    invitation_token character varying(255) NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    accepted_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    message text,
    clerk_invitation_id character varying(255),
    pending_package_type text,
    pending_billing_cycles integer,
    pending_amount_cents integer
);


--
-- TOC entry 358 (class 1259 OID 19047)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id text NOT NULL,
    stack_user_id text,
    role public."UserRole" NOT NULL,
    name text NOT NULL,
    phone text,
    timezone text DEFAULT 'America/Chicago'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    email text,
    profile_picture_url text,
    first_name text,
    last_name text,
    concierge_bio text,
    concierge_title text,
    concierge_specialties text[],
    concierge_experience integer,
    is_active_concierge boolean DEFAULT false NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    clerk_user_id text,
    legacy_id bigint,
    allow_direct_messages boolean DEFAULT true NOT NULL,
    message_notification_email boolean DEFAULT true NOT NULL,
    message_notification_in_app boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true
);


--
-- TOC entry 357 (class 1259 OID 17514)
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- TOC entry 343 (class 1259 OID 17160)
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- TOC entry 346 (class 1259 OID 17183)
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- TOC entry 345 (class 1259 OID 17182)
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 350 (class 1259 OID 17282)
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 350
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 354 (class 1259 OID 17402)
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- TOC entry 355 (class 1259 OID 17415)
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 349 (class 1259 OID 17274)
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 351 (class 1259 OID 17292)
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 351
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 352 (class 1259 OID 17341)
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- TOC entry 353 (class 1259 OID 17355)
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 356 (class 1259 OID 17425)
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 3959 (class 2604 OID 16514)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4181 (class 2604 OID 19476)
-- Name: migration_state id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_state ALTER COLUMN id SET DEFAULT nextval('public.migration_state_id_seq'::regclass);


--
-- TOC entry 4936 (class 0 OID 16529)
-- Dependencies: 320
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 4953 (class 0 OID 17078)
-- Dependencies: 340
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4947 (class 0 OID 16883)
-- Dependencies: 334
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- TOC entry 4938 (class 0 OID 16681)
-- Dependencies: 325
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- TOC entry 4935 (class 0 OID 16522)
-- Dependencies: 319
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4942 (class 0 OID 16770)
-- Dependencies: 329
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- TOC entry 4941 (class 0 OID 16758)
-- Dependencies: 328
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- TOC entry 4940 (class 0 OID 16745)
-- Dependencies: 327
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- TOC entry 4950 (class 0 OID 16995)
-- Dependencies: 337
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- TOC entry 4952 (class 0 OID 17068)
-- Dependencies: 339
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- TOC entry 4949 (class 0 OID 16965)
-- Dependencies: 336
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- TOC entry 4951 (class 0 OID 17028)
-- Dependencies: 338
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- TOC entry 4948 (class 0 OID 16933)
-- Dependencies: 335
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4934 (class 0 OID 16511)
-- Dependencies: 318
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- TOC entry 4945 (class 0 OID 16812)
-- Dependencies: 332
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- TOC entry 4946 (class 0 OID 16830)
-- Dependencies: 333
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- TOC entry 4937 (class 0 OID 16537)
-- Dependencies: 321
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- TOC entry 4939 (class 0 OID 16711)
-- Dependencies: 326
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- TOC entry 4944 (class 0 OID 16797)
-- Dependencies: 331
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4943 (class 0 OID 16788)
-- Dependencies: 330
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- TOC entry 4932 (class 0 OID 16499)
-- Dependencies: 316
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- TOC entry 4955 (class 0 OID 17143)
-- Dependencies: 342
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- TOC entry 4954 (class 0 OID 17120)
-- Dependencies: 341
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- TOC entry 5018 (class 0 OID 19575)
-- Dependencies: 409
-- Data for Name: _PackageJobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_PackageJobs" ("A", "B") FROM stdin;
\.


--
-- TOC entry 5017 (class 0 OID 19566)
-- Dependencies: 408
-- Data for Name: action_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.action_logs (id, execution_id, action_type, entity_type, entity_id, status, message, details, created_at) FROM stdin;
\.


--
-- TOC entry 5003 (class 0 OID 19431)
-- Dependencies: 394
-- Data for Name: additional_service_purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.additional_service_purchases (id, service_id, user_id, seeker_id, employer_id, payment_id, amount_paid, status, assigned_admin_id, fulfillment_notes, completed_at, created_at, updated_at, employer_package_id) FROM stdin;
\.


--
-- TOC entry 5004 (class 0 OID 19442)
-- Dependencies: 395
-- Data for Name: additional_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.additional_services (id, service_id, name, description, price, category, user_type, is_active, features, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4980 (class 0 OID 19217)
-- Dependencies: 371
-- Data for Name: admin_actions_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_actions_log (id, admin_id, action_type, target_entity, target_id, details, created_at) FROM stdin;
\.


--
-- TOC entry 5012 (class 0 OID 19517)
-- Dependencies: 403
-- Data for Name: app_fields; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_fields (id, field_key, name, data_type, model_name, is_system_field, is_required, description, group_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4972 (class 0 OID 19135)
-- Dependencies: 363
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.applications (id, job_id, seeker_id, resume_url, cover_letter, status, applied_at, updated_at, interview_completed_at, interview_scheduled_at, interview_stage, interviewer_notes, next_action_deadline, next_action_required, resume_id, legacy_id) FROM stdin;
\.


--
-- TOC entry 4975 (class 0 OID 19166)
-- Dependencies: 366
-- Data for Name: cancellation_surveys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cancellation_surveys (id, seeker_id, subscription_id, primary_reason, reason_other_text, job_satisfaction, overall_experience, improvement_feedback, recommend_to_others, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4983 (class 0 OID 19243)
-- Dependencies: 374
-- Data for Name: concierge_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.concierge_chat_messages (id, chat_id, sender_id, sender_type, message, message_type, file_url, file_name, file_size, read_at, created_at) FROM stdin;
\.


--
-- TOC entry 4982 (class 0 OID 19234)
-- Dependencies: 373
-- Data for Name: concierge_chats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.concierge_chats (id, job_id, employer_id, admin_id, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4981 (class 0 OID 19225)
-- Dependencies: 372
-- Data for Name: concierge_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.concierge_requests (id, job_id, employer_id, status, assigned_admin_id, discovery_call_notes, optimized_job_description, shortlisted_candidates, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4987 (class 0 OID 19277)
-- Dependencies: 378
-- Data for Name: cover_letter_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cover_letter_templates (id, seeker_id, title, content, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5009 (class 0 OID 19485)
-- Dependencies: 400
-- Data for Name: crm_sync_change_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.crm_sync_change_logs (id, super_admin_id, super_admin_name, action_type, action_details, entity_type, entity_id, old_value, new_value, created_at) FROM stdin;
\.


--
-- TOC entry 5015 (class 0 OID 19546)
-- Dependencies: 406
-- Data for Name: crm_sync_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.crm_sync_logs (id, mapping_id, user_id, direction, status, error_message, data_snapshot, duration_ms, created_at) FROM stdin;
\.


--
-- TOC entry 5010 (class 0 OID 19493)
-- Dependencies: 401
-- Data for Name: crm_sync_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.crm_sync_settings (id, is_global_sync_enabled, default_sync_direction, sync_on_create, sync_on_update, sync_batch_size, retry_attempts, retry_delay_seconds, ghl_api_key, ghl_location_id, ghl_connection_status, ghl_last_tested, ghl_last_tested_by, last_updated_by, last_saved_by, last_saved_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4996 (class 0 OID 19361)
-- Dependencies: 387
-- Data for Name: email_blast_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_blast_requests (id, job_id, employer_id, package_id, status, admin_notes, requested_at, started_at, completed_at, email_sent_at, expires_at, logo_url, content, custom_link, use_job_link, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4970 (class 0 OID 19097)
-- Dependencies: 361
-- Data for Name: employer_packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employer_packages (id, employer_id, job_ids, listings_remaining, purchased_at, expires_at, created_at, updated_at, package_type, featured_listings_remaining, featured_listings_used, is_recurring, billing_frequency, billing_cycles_total, billing_cycles_completed, next_billing_date, recurring_amount_cents, arb_subscription_id, recurring_status, extension_requested_at, extension_requested_months, extension_request_status, extension_reviewed_at, extension_reviewed_by) FROM stdin;
cmnweyzze000f463ax0723k1r	cmnweyvzy000a463awsr5k50u	\N	1	2026-04-12 23:47:49.034	2026-10-12 23:47:49.032	2026-04-12 23:47:49.034	2026-04-12 23:47:49.034	gold_plus_recurring_6mo	0	0	t	monthly	6	1	2026-05-12 23:47:49.032+00	9700	\N	active	\N	\N	\N	\N	\N
cmnwez3tf000n463a20iruvh4	cmnweyzqu000d463aia3y1ba7	\N	1	2026-04-12 23:47:54.004	2026-10-12 23:47:54.002	2026-04-12 23:47:54.004	2026-04-12 23:47:54.004	gold_plus_recurring_6mo	0	0	t	monthly	6	1	2026-05-12 23:47:54.002+00	9700	\N	active	\N	\N	\N	\N	\N
cmnwezdeq0013463add0q1p5c	cmnwez690000s463a123w25dg	\N	1	2026-04-12 23:48:06.434	2026-10-12 23:48:06.432	2026-04-12 23:48:06.434	2026-04-12 23:48:06.434	gold_plus_recurring_6mo	0	0	t	monthly	6	1	2026-05-12 23:48:06.432+00	9700	\N	active	\N	\N	\N	\N	\N
cmnweze730015463aic0vmnfe	cmnweza41000z463aqdrimbay	\N	1	2026-04-12 23:48:07.311	2026-04-12 23:48:13.712	2026-04-12 23:48:07.311	2026-04-12 23:48:13.713	gold_plus_recurring_6mo	0	0	t	monthly	6	1	2026-05-12 23:48:07.296+00	9700	\N	cancelled	\N	\N	\N	\N	\N
\.


--
-- TOC entry 4969 (class 0 OID 19087)
-- Dependencies: 360
-- Data for Name: employers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employers (user_id, company_name, company_website, company_logo_url, company_description, billing_address, tax_id, current_package_id, is_suspended, created_at, updated_at, is_vetted, vetted_at, vetted_by, team_id, mission_statement, core_values, exclusive_plan_type, exclusive_plan_name, exclusive_plan_amount_cents, exclusive_plan_cycles, exclusive_plan_offered_at, exclusive_plan_dismissed_at, exclusive_plan_activated_at, exclusive_plan_source) FROM stdin;
cmnwdb60t0001qnzvztx96b36	XYS	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:01:18.223	2026-04-12 23:01:18.223	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmnwet34i0013u7fwez6xtmy0	Test Co	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:43:13.171	2026-04-12 23:43:13.171	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmnweydns0003463ake1gf7kz	JEST_EXCLUSIVE_PLAN_Company_eligibility_b1_1776037638243	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:47:20.837	2026-04-12 23:47:23.877	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:47:23.877196+00	\N	\N	invitation
cmnweyicj0005463aqqnrzd78	JEST_EXCLUSIVE_PLAN_Company_eligibility_b2_1776037638243	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:47:26.927	2026-04-12 23:47:26.927	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmnweyk2g0006463anbpwt9md	JEST_EXCLUSIVE_PLAN_Company_eligibility_b3_1776037638243	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:47:29.142	2026-04-12 23:47:29.142	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmnweymcf0007463abvrppouf	JEST_EXCLUSIVE_PLAN_Company_offer_c1_1776037638243	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:47:32.092	2026-04-12 23:47:34.406	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:47:34.405645+00	\N	\N	invitation
cmnweyqbh0008463amnc18tjz	JEST_EXCLUSIVE_PLAN_Company_offer_c2_1776037638243	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:47:37.255	2026-04-12 23:47:37.255	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmnweys0t0009463atmxwwoek	JEST_EXCLUSIVE_PLAN_Company_dismiss_d1_1776037638243	\N	\N	\N	\N	\N	\N	f	2026-04-12 23:47:39.454	2026-04-12 23:47:41.734	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:47:41.733796+00	2026-04-12 23:47:44.966524+00	\N	invitation
cmnweyvzy000a463awsr5k50u	JEST_EXCLUSIVE_PLAN_Company_activate_e1_1776037638243	\N	\N	\N	\N	\N	cmnweyzze000f463ax0723k1r	f	2026-04-12 23:47:44.611	2026-04-12 23:47:46.918	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:47:46.917828+00	\N	2026-04-12 23:47:49.86847+00	invitation
cmnweyzqu000d463aia3y1ba7	JEST_EXCLUSIVE_PLAN_Company_activate_e2_1776037638243	\N	\N	\N	\N	\N	cmnwez3tf000n463a20iruvh4	f	2026-04-12 23:47:49.459	2026-04-12 23:47:51.898	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:47:51.898163+00	\N	2026-04-12 23:47:54.826043+00	invitation
cmnwez690000s463a123w25dg	JEST_EXCLUSIVE_PLAN_Company_edge_f2_1776037638243	\N	\N	\N	\N	\N	cmnwezdeq0013463add0q1p5c	f	2026-04-12 23:47:57.894	2026-04-12 23:48:00.342	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:48:00.341622+00	2026-04-12 23:48:03.583746+00	2026-04-12 23:48:07.259907+00	invitation
cmnweza41000z463aqdrimbay	JEST_EXCLUSIVE_PLAN_Company_cancel_g1_1776037638243	\N	\N	\N	\N	\N	cmnweze730015463aic0vmnfe	f	2026-04-12 23:48:02.891	2026-04-12 23:48:05.181	f	\N	\N	\N	\N	\N	gold_plus_recurring_6mo	Gold Plus Small Business (6-Month Recurring)	9700	6	2026-04-12 23:48:05.181152+00	\N	2026-04-12 23:48:08.278101+00	invitation
cmnwux1ev0008iljhi0qe6795	Boyle and Navarro Traders	\N	\N	\N	\N	\N	\N	f	2026-04-13 07:14:12.179	2026-04-13 07:14:12.179	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- TOC entry 5016 (class 0 OID 19554)
-- Dependencies: 407
-- Data for Name: execution_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.execution_logs (id, task_name, status, started_at, completed_at, duration_ms, summary, log_output, triggered_by, created_at) FROM stdin;
\.


--
-- TOC entry 4993 (class 0 OID 19334)
-- Dependencies: 384
-- Data for Name: external_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_payments (id, user_id, ghl_transaction_id, authnet_transaction_id, authnet_customer_id, amount, plan_id, status, error_message, webhook_processed_at, created_at, updated_at) FROM stdin;
cmnvsdtig0003fcdrpndhyp35	cmnvsdo340001fcdraw8t399a	\N	\N	\N	49.990000000000000000000000000000	gold	completed	\N	2026-04-12 13:15:29.319	2026-04-12 13:15:29.32	2026-04-12 13:15:29.32
cmnvswgid0005556wyu7tm55w	cmnvswbbg0002556wfjr1yc2y	\N	\N	\N	79.990000000000000000000000000000	vip-platinum	completed	\N	2026-04-12 13:29:58.932	2026-04-12 13:29:58.933	2026-04-12 13:29:58.933
cmnvtg58o00031230e9ey4v8n	cmnvtfzzq000012305tumy8uw	\N	\N	\N	34.990000000000000000000000000000	trial	completed	\N	2026-04-12 13:45:17.447	2026-04-12 13:45:17.449	2026-04-12 13:45:17.449
cmnwus3gu0004iljhssqlvdk4	cmnwury8c0002iljhg0pk5s2a	\N	\N	\N	79.990000000000000000000000000000	vip-platinum	completed	\N	2026-04-13 07:10:20.813	2026-04-13 07:10:20.815	2026-04-13 07:10:20.815
\.


--
-- TOC entry 4995 (class 0 OID 19350)
-- Dependencies: 386
-- Data for Name: featured_job_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.featured_job_requests (id, job_id, employer_id, package_id, status, admin_notes, requested_at, started_at, completed_at, email_sent_at, extension_granted, extension_expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5013 (class 0 OID 19527)
-- Dependencies: 404
-- Data for Name: field_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.field_groups (id, name, description, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5014 (class 0 OID 19536)
-- Dependencies: 405
-- Data for Name: field_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.field_mappings (id, group_id, ghl_field_id, app_field_id, sync_direction, is_enabled, display_label, transform_rules, created_by, updated_by, created_at, updated_at, last_synced_at, last_sync_status, last_sync_error, is_auto_generated) FROM stdin;
\.


--
-- TOC entry 5011 (class 0 OID 19508)
-- Dependencies: 402
-- Data for Name: ghl_fields; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ghl_fields (id, ghl_field_id, ghl_field_key, name, data_type, picklist_options, is_system_field, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4973 (class 0 OID 19144)
-- Dependencies: 364
-- Data for Name: interview_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interview_history (id, application_id, stage, scheduled_at, completed_at, notes, interviewer_id, feedback, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4978 (class 0 OID 19197)
-- Dependencies: 369
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, employer_package_id, authnet_transaction_id, amount_due, status, created_at, updated_at, description, package_name, due_date, paid_at) FROM stdin;
cmnwez14g000h463aziubztft	cmnweyzze000f463ax0723k1r	JEST_EXCLUSIVE_PLAN_TXN_1776037638243	9700	paid	2026-04-12 23:47:50.513	2026-04-12 23:47:50.513	First payment for Gold Plus Small Business (6-Month Recurring)	Gold Plus Small Business (6-Month Recurring)	2026-04-12 23:47:50.511	2026-04-12 23:47:50.511
cmnwez4y3000r463aqpd8kgzz	cmnwez3tf000n463a20iruvh4	JEST_EXCLUSIVE_PLAN_TXN_E2_1776037638243	9700	paid	2026-04-12 23:47:55.468	2026-04-12 23:47:55.468	First payment for Gold Plus Small Business (6-Month Recurring)	Gold Plus Small Business (6-Month Recurring)	2026-04-12 23:47:55.466	2026-04-12 23:47:55.466
cmnwezejn0017463a597mj69e	cmnwezdeq0013463add0q1p5c	JEST_EXCLUSIVE_PLAN_TXN_F2_1776037638243	9700	paid	2026-04-12 23:48:07.908	2026-04-12 23:48:07.908	First payment for Gold Plus Small Business (6-Month Recurring)	Gold Plus Small Business (6-Month Recurring)	2026-04-12 23:48:07.907	2026-04-12 23:48:07.907
cmnwezfc80019463auxny7iot	cmnweze730015463aic0vmnfe	JEST_EXCLUSIVE_PLAN_TXN_G1_1776037638243	9700	paid	2026-04-12 23:48:08.937	2026-04-12 23:48:08.937	First payment for Gold Plus Small Business (6-Month Recurring)	Gold Plus Small Business (6-Month Recurring)	2026-04-12 23:48:08.936	2026-04-12 23:48:08.936
\.


--
-- TOC entry 4968 (class 0 OID 19062)
-- Dependencies: 359
-- Data for Name: job_seekers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_seekers (user_id, headline, about_me, availability, skills, portfolio_urls, resume_url, resume_last_uploaded, membership_plan, membership_expires_at, is_suspended, created_at, updated_at, resume_credits, salary_expectations, allow_direct_messages, application_updates, email_alerts, job_recommendations, profile_visibility, show_salary_expectations, weekly_digest, allow_job_invitations, resume_limit, resumes_used, trial_ends_at, is_on_trial, cancelled_seeker, cancelled_at, has_previous_subscription, education, work_experience, professional_summary, resume_carryover_count, last_billing_period_start) FROM stdin;
cmnweyaxe0000145rt4vy33dh	\N	\N	\N	\N	\N	\N	\N	none	\N	f	2026-04-12 23:47:16.562	2026-04-12 23:47:16.562	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnweyc6b0001145r7wb76nhr	\N	\N	\N	\N	\N	\N	\N	none	\N	f	2026-04-12 23:47:18.18	2026-04-12 23:47:18.18	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnweydf80002145rv2lv88ok	\N	\N	\N	\N	\N	\N	\N	none	\N	f	2026-04-12 23:47:19.796	2026-04-12 23:47:19.796	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnwury8c0002iljhg0pk5s2a	\N	\N	Not specified	{}	\N	\N	\N	vip_quarterly	2026-05-13 07:10:21.531	f	2026-04-13 07:10:14.789	2026-04-13 07:10:22.255	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnvrbzxy0003sl1u570m3ict	\N	\N	Not specified	{}	\N	\N	\N	none	\N	f	2026-04-12 12:46:05.474	2026-04-12 12:46:05.472	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnvruw8000017rljwt7y5297	\N	\N	Not specified	{}	\N	\N	\N	none	\N	f	2026-04-12 13:00:47.118	2026-04-12 13:00:47.114	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnvsdo340001fcdraw8t399a	\N	\N	Not specified	{}	\N	\N	\N	gold_bimonthly	2026-05-12 13:15:30.087	f	2026-04-12 13:15:23.075	2026-04-12 13:15:30.84	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnvswbbg0002556wfjr1yc2y	\N	\N	Not specified	{}	\N	\N	\N	vip_quarterly	2026-05-12 13:29:59.678	f	2026-04-12 13:29:52.92	2026-04-12 13:30:00.415	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnvt0qbr000a556wmmicigzn	\N	\N	Not specified	{}	\N	\N	\N	none	\N	f	2026-04-12 13:33:19.04	2026-04-12 13:33:19.038	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnvtfzzq000012305tumy8uw	\N	\N	Not specified	{}	\N	\N	\N	trial_monthly	2026-04-15 13:45:18.193	f	2026-04-12 13:45:11.378	2026-04-12 13:45:18.961	0	\N	t	t	t	t	employers_only	t	f	t	0	0	2026-04-15 13:45:18.193	t	f	\N	f	\N	\N	\N	0	\N
cmnvtj6z900071230bi299cpe	\N	\N	Not specified	{}	\N	\N	\N	none	\N	f	2026-04-12 13:47:40.424	2026-04-12 13:47:40.423	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnwes9zv0003qrr4wqwjc7ps	\N	\N	\N	\N	\N	\N	\N	none	\N	f	2026-04-12 23:42:35.42	2026-04-12 23:42:35.42	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnwesb6z0004qrr48d1s3bgm	\N	\N	\N	\N	\N	\N	\N	none	\N	f	2026-04-12 23:42:36.971	2026-04-12 23:42:36.971	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
cmnwescdx0005qrr427cd1c3g	\N	\N	\N	\N	\N	\N	\N	none	\N	f	2026-04-12 23:42:38.518	2026-04-12 23:42:38.518	0	\N	t	t	t	t	employers_only	t	f	t	0	0	\N	f	f	\N	f	\N	\N	\N	0	\N
\.


--
-- TOC entry 4971 (class 0 OID 19111)
-- Dependencies: 362
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jobs (id, employer_id, title, pay_range_min, pay_range_max, pay_range_text, type, description, skills_required, is_flexible_hours, hours_per_week, remote_schedule, location_text, status, rejection_reason, concierge_requested, concierge_status, created_at, updated_at, expires_at, approved_at, benefits, views_count, salary_type, experience_level, application_deadline, requirements, contact_phone, linkedin_profile, website, category, email_blast_completed_at, email_blast_expires_at, email_blast_requested_at, email_blast_status, featured_completed_at, featured_extension_expires_at, featured_extension_granted, featured_requested_at, featured_status, is_email_blast, is_featured, is_company_private, applicants_visible_to_employer, applicants_visible_last_toggled, applicants_visible_toggled_by, chat_enabled, chat_enabled_at, archived_at, archived_by, is_archived, is_paused, paused_at, paused_by, paused_days_remaining, resumed_at, legacy_id, manual_approve) FROM stdin;
\.


--
-- TOC entry 4999 (class 0 OID 19394)
-- Dependencies: 390
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_attachments (id, message_id, file_name, file_url, file_type, file_size, mime_type, created_at) FROM stdin;
\.


--
-- TOC entry 5002 (class 0 OID 19423)
-- Dependencies: 393
-- Data for Name: message_drafts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_drafts (id, user_id, recipient_id, thread_id, content, attachments, last_saved_at) FROM stdin;
\.


--
-- TOC entry 5001 (class 0 OID 19412)
-- Dependencies: 392
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_templates (id, user_id, name, category, content, is_default, usage_count, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5000 (class 0 OID 19402)
-- Dependencies: 391
-- Data for Name: message_threads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_threads (id, participants, last_message_at, created_at, updated_at, legacy_id) FROM stdin;
\.


--
-- TOC entry 4998 (class 0 OID 19383)
-- Dependencies: 389
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, recipient_id, content, is_read, delivery_status, application_id, job_id, thread_id, created_at, updated_at, legacy_id) FROM stdin;
\.


--
-- TOC entry 5008 (class 0 OID 19473)
-- Dependencies: 399
-- Data for Name: migration_state; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migration_state (id, migration_name, last_migrated_id, last_migrated_at, total_migrated, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4991 (class 0 OID 19316)
-- Dependencies: 382
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, data, read, priority, action_url, created_at, read_at) FROM stdin;
cmnwez2ic000j463affm0d0w0	cmnweyvzy000a463awsr5k50u	exclusive_plan_activated	Exclusive Plan Activated! 🚀	Your Gold Plus Small Business (6-Month Recurring) subscription is now active. You'll be billed $97.00/month. Start posting jobs now!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "amountFormatted": "$97.00"}	f	high	/employer/dashboard	2026-04-12 23:47:52.308	\N
cmnwez485000p463ajrvfk5mi	cmnweyesh0004463anjqjv5wr	exclusive_plan_admin_alert	Exclusive Plan Activated! 💰	Test User activate_e1 (jest_exclusive_plan_user_activate_e1_1776037638243@test.com) activated Gold Plus Small Business (6-Month Recurring) - First payment of $97.00 received!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "employerName": "Test User activate_e1", "employerEmail": "jest_exclusive_plan_user_activate_e1_1776037638243@test.com", "transactionId": "JEST_EXCLUSIVE_PLAN_TXN_1776037638243", "employerUserId": "cmnweyvzy000a463awsr5k50u"}	f	high	/admin/subscription-management?tab=exclusive-offers	2026-04-12 23:47:54.533	\N
cmnwez6at000u463ayhid66ts	cmnweyzqu000d463aia3y1ba7	exclusive_plan_activated	Exclusive Plan Activated! 🚀	Your Gold Plus Small Business (6-Month Recurring) subscription is now active. You'll be billed $97.00/month. Start posting jobs now!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "amountFormatted": "$97.00"}	f	high	/employer/dashboard	2026-04-12 23:47:57.221	\N
cmnwez7zv000y463a8veile6a	cmnweyesh0004463anjqjv5wr	exclusive_plan_admin_alert	Exclusive Plan Activated! 💰	Test User activate_e2 (jest_exclusive_plan_user_activate_e2_1776037638243@test.com) activated Gold Plus Small Business (6-Month Recurring) - First payment of $97.00 received!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "employerName": "Test User activate_e2", "employerEmail": "jest_exclusive_plan_user_activate_e2_1776037638243@test.com", "transactionId": "JEST_EXCLUSIVE_PLAN_TXN_E2_1776037638243", "employerUserId": "cmnweyzqu000d463aia3y1ba7"}	f	high	/admin/subscription-management?tab=exclusive-offers	2026-04-12 23:47:59.419	\N
cmnwezfx5001b463ass3dmp4t	cmnwez690000s463a123w25dg	exclusive_plan_activated	Exclusive Plan Activated! 🚀	Your Gold Plus Small Business (6-Month Recurring) subscription is now active. You'll be billed $97.00/month. Start posting jobs now!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "amountFormatted": "$97.00"}	f	high	/employer/dashboard	2026-04-12 23:48:09.69	\N
cmnwezgpz001d463ajeqqpyx2	cmnweza41000z463aqdrimbay	exclusive_plan_activated	Exclusive Plan Activated! 🚀	Your Gold Plus Small Business (6-Month Recurring) subscription is now active. You'll be billed $97.00/month. Start posting jobs now!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "amountFormatted": "$97.00"}	f	high	/employer/dashboard	2026-04-12 23:48:10.727	\N
cmnwezhme001h463aju0mvhq5	cmnweyesh0004463anjqjv5wr	exclusive_plan_admin_alert	Exclusive Plan Activated! 💰	Test User edge_f2 (jest_exclusive_plan_user_edge_f2_1776037638243@test.com) activated Gold Plus Small Business (6-Month Recurring) - First payment of $97.00 received!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "employerName": "Test User edge_f2", "employerEmail": "jest_exclusive_plan_user_edge_f2_1776037638243@test.com", "transactionId": "JEST_EXCLUSIVE_PLAN_TXN_F2_1776037638243", "employerUserId": "cmnwez690000s463a123w25dg"}	f	high	/admin/subscription-management?tab=exclusive-offers	2026-04-12 23:48:11.894	\N
cmnwezifr001l463a8u1vvkes	cmnweyesh0004463anjqjv5wr	exclusive_plan_admin_alert	Exclusive Plan Activated! 💰	Test User cancel_g1 (jest_exclusive_plan_user_cancel_g1_1776037638243@test.com) activated Gold Plus Small Business (6-Month Recurring) - First payment of $97.00 received!	{"planName": "Gold Plus Small Business (6-Month Recurring)", "amountCents": 9700, "employerName": "Test User cancel_g1", "employerEmail": "jest_exclusive_plan_user_cancel_g1_1776037638243@test.com", "transactionId": "JEST_EXCLUSIVE_PLAN_TXN_G1_1776037638243", "employerUserId": "cmnweza41000z463aqdrimbay"}	f	high	/admin/subscription-management?tab=exclusive-offers	2026-04-12 23:48:12.951	\N
\.


--
-- TOC entry 4979 (class 0 OID 19206)
-- Dependencies: 370
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_methods (id, employer_id, seeker_id, type, last4, brand, expiry_month, expiry_year, is_default, authnet_payment_profile_id, billing_first_name, billing_last_name, billing_address, billing_city, billing_state, billing_zip_code, created_at, updated_at, is_legacy) FROM stdin;
\.


--
-- TOC entry 4994 (class 0 OID 19342)
-- Dependencies: 385
-- Data for Name: pending_job_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pending_job_posts (id, stack_user_id, email, job_data, selected_package, session_token, return_url, checkout_session_id, expires_at, created_at, updated_at, clerk_user_id) FROM stdin;
\.


--
-- TOC entry 4992 (class 0 OID 19326)
-- Dependencies: 383
-- Data for Name: pending_signups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pending_signups (id, stack_user_id, onboarding_data, selected_plan, session_token, return_url, checkout_session_id, expires_at, created_at, updated_at, email, clerk_user_id) FROM stdin;
cmnvt95xu00003i9d8lis4qzx	\N	{"role":"seeker","firstName":"","lastName":"","location":"","professionalSummary":""}	none	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:39:52.765	2026-04-12 13:39:51.762	2026-04-12 13:39:52.765		user_3CG9kNMrITZY0vDDWO8swLk9CYw
cmnvruy3q00027rlj0w304fat	\N	{"role":null,"firstName":"fourth","lastName":"Seeker","location":"","selectedPackage":"vip-platinum","experience":"","skills":[],"companyName":"","companySize":"","professionalSummary":""}	vip-platinum	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:00:48.805	2026-04-12 13:00:48.806	2026-04-12 13:00:48.806		user_3CG4sGMpHq8gN2YwhLLm6qWM0zx
cmnvtg1we00011230ittgt09u	\N	{"role":null,"firstName":"Twelve","lastName":"Seeker","location":"","selectedPackage":"trial","experience":"","skills":[],"companyName":"","companySize":"","professionalSummary":""}	trial	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:45:13.118	2026-04-12 13:45:13.119	2026-04-12 13:45:13.119		user_3CG9rQ0CwtMQOUntXS20tf2U3Aj
cmnvsf9ju0006fcdrwvf9skrt	\N	{"onboardingData":{"role":"seeker","firstName":"Six","lastName":"Seeker","location":"Remote","professionalSummary":"In your Professional Summary, you may include your career title and years of experience, key remote-related skills like communication and time management, highlight any relevant work experience, and also mention personal traits or soft skills that make you a great candidate.\\n\\n","skills":["aws"],"experience":"2-5","selectedPackage":"annual-platinum"},"selectedPackage":"annual-platinum"}	annual-platinum	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:16:58.968	2026-04-12 13:16:36.762	2026-04-12 13:17:22.795		user_3CG6vGNqqZYX89rfvHEpUM9TUsd
cmnwde4i40002qnzvv66agchy	\N	{"role":null,"firstName":"First","lastName":"Employer","location":"","professionalSummary":""}	none	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 23:03:35.5	2026-04-12 23:03:35.501	2026-04-12 23:03:35.501		user_3CHFzGF6C7ugB3IzwHtY2XbxfOK
cmnvr75z60000sl1u2mxo9pv3	\N	{"role":"seeker","firstName":"First","lastName":"Seeker","location":"Remote","selectedPackage":"vip-platinum","experience":"","skills":[],"companyName":"","companySize":"","professionalSummary":""}	vip-platinum	DRAFT	http://localhost:3000/dashboard	\N	2026-04-14 07:08:01.014	2026-04-12 12:42:19.266	2026-04-13 07:08:01.014		user_3CG2kHp101XwnrPEac4o5g66LbN
cmnvsjs490007fcdr52thtuar	\N	{"onboardingData":{"role":"seeker","firstName":"Seven","lastName":"Seeker","location":"Remote","professionalSummary":"In your Professional Summary, you may include your career title and years of experience, key remote-related skills like communication and time management, highlight any relevant work experience, and also mention personal traits or soft skills that make you a great candidate.\\n\\n","experience":"2-5","skills":["aws"],"selectedPackage":"annual-platinum"},"selectedPackage":"annual-platinum"}	annual-platinum	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:20:37.746	2026-04-12 13:20:07.449	2026-04-12 13:20:41.123		user_3CG7L6YdMOQrZdBn5ytFNsmANeJ
cmnvssazz0000556wuxictwma	\N	{"onboardingData":{"role":"seeker","firstName":"Eight","lastName":"Seeker","location":"Remote","professionalSummary":"In your Professional Summary, you may include your career title and years of experience, key remote-related skills like communication and time management, highlight any relevant work experience, and also mention personal traits or soft skills that make you a great candidate.\\n\\n","experience":"2-5","skills":["AWS"],"selectedPackage":"vip-platinum"},"selectedPackage":"vip-platinum"}	vip-platinum	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:27:06.059	2026-04-12 13:26:45.168	2026-04-12 13:27:08.336		user_3CG89TdnnOuPGAqvPOoBe2ll0UM
cmnvswd6h0003556w0yjydhs2	\N	{"role":null,"firstName":"Nine","lastName":"Seeker","location":"","selectedPackage":"vip-platinum","experience":"","skills":[],"companyName":"","companySize":"","professionalSummary":""}	vip-platinum	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 13:29:54.616	2026-04-12 13:29:54.617	2026-04-12 13:29:54.617		user_3CG8QE4P8h5HnQ7Kxx5QBDrQjdK
cmnvrm0mt0000nbczvns41poz	\N	{"onboardingData":{"role":"seeker","firstName":"Third","lastName":"Seeker","location":"Remote","professionalSummary":"In your Professional Summary, you may include your career title and years of experience, key remote-related skills like communication and time management, highlight any relevant work experience, and also mention personal traits or soft skills that make you a great candidate.\\n\\n","experience":"2-5","skills":["aws"],"selectedPackage":"gold"},"selectedPackage":"gold"}	gold	DRAFT	http://localhost:3000/dashboard	\N	2026-04-13 12:56:40.186	2026-04-12 12:53:52.181	2026-04-12 12:56:42.67		user_3CG49ZV3B7UHI5v3wcvH4NPgK99
\.


--
-- TOC entry 5006 (class 0 OID 19463)
-- Dependencies: 397
-- Data for Name: purchased_add_ons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchased_add_ons (id, "employerPackageId", "addOnId", quantity, price, "expiresAt", created_at) FROM stdin;
\.


--
-- TOC entry 4977 (class 0 OID 19184)
-- Dependencies: 368
-- Data for Name: resume_critiques; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resume_critiques (id, seeker_id, requested_at, created_at, updated_at, resume_url, analysis, completed_at, cost, priority, reviewer_id, target_industry, target_role, status) FROM stdin;
\.


--
-- TOC entry 4997 (class 0 OID 19372)
-- Dependencies: 388
-- Data for Name: resumes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resumes (id, seeker_id, filename, file_url, file_size, is_primary, uploaded_at, created_at, updated_at, status, deleted_at) FROM stdin;
\.


--
-- TOC entry 4986 (class 0 OID 19269)
-- Dependencies: 377
-- Data for Name: saved_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saved_jobs (id, seeker_id, job_id, saved_at) FROM stdin;
\.


--
-- TOC entry 4985 (class 0 OID 19260)
-- Dependencies: 376
-- Data for Name: seeker_concierge_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seeker_concierge_chat_messages (id, chat_id, sender_id, sender_type, message, message_type, file_url, file_name, file_size, read_at, created_at) FROM stdin;
\.


--
-- TOC entry 4984 (class 0 OID 19252)
-- Dependencies: 375
-- Data for Name: seeker_concierge_chats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seeker_concierge_chats (id, job_id, seeker_id, admin_id, created_at) FROM stdin;
\.


--
-- TOC entry 5005 (class 0 OID 19454)
-- Dependencies: 396
-- Data for Name: service_request_audits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_request_audits (service_request_id, changed_by, change_type, previous_value, new_value, description, created_at, id) FROM stdin;
\.


--
-- TOC entry 4976 (class 0 OID 19175)
-- Dependencies: 367
-- Data for Name: subscription_cancellation_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_cancellation_logs (id, subscription_id, admin_id, seeker_id, previous_period_end, new_period_end, created_at) FROM stdin;
\.


--
-- TOC entry 4974 (class 0 OID 19154)
-- Dependencies: 365
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, seeker_id, authnet_subscription_id, authnet_customer_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at, ghl_transaction_id, external_payment_id, tier, tier_metadata, expires_at, is_legacy_beta, current_period_start, billing_frequency, next_billing_date, legacy_id) FROM stdin;
cmnwus40s0006iljhurks29jh	cmnwury8c0002iljhg0pk5s2a	\N	\N	vip_quarterly	active	2026-05-13 07:10:21.531	f	2026-04-13 07:10:21.532	2026-04-13 07:10:21.532	\N	cmnwus3gu0004iljhssqlvdk4	\N	{}	\N	f	2026-04-13 07:10:21.531	\N	2026-05-13 07:10:21.531	\N
cmnvsdu3s0005fcdrwby76zmv	cmnvsdo340001fcdraw8t399a	\N	\N	gold_bimonthly	active	2026-05-12 13:15:30.087	f	2026-04-12 13:15:30.088	2026-04-12 13:15:30.088	\N	cmnvsdtig0003fcdrpndhyp35	\N	{}	\N	f	2026-04-12 13:15:30.087	\N	2026-05-12 13:15:30.087	\N
cmnvswh320007556w1en2u3cm	cmnvswbbg0002556wfjr1yc2y	\N	\N	vip_quarterly	active	2026-05-12 13:29:59.678	f	2026-04-12 13:29:59.679	2026-04-12 13:29:59.679	\N	cmnvswgid0005556wyu7tm55w	\N	{}	\N	f	2026-04-12 13:29:59.678	\N	2026-05-12 13:29:59.678	\N
cmnvtg5td00051230lffhdicd	cmnvtfzzq000012305tumy8uw	\N	\N	trial_monthly	active	2026-04-15 13:45:18.193	f	2026-04-12 13:45:18.194	2026-04-12 13:45:18.194	\N	cmnvtg58o00031230e9ey4v8n	\N	{}	\N	f	2026-04-12 13:45:18.193	\N	2026-04-15 13:45:18.193	\N
cmnwesdkp0007qrr4symhj4td	cmnwes9zv0003qrr4wqwjc7ps	arb-phase7-1776037354396-1	cust-phase7-1776037354396-1	gold_bimonthly	active	2026-06-11 23:42:40.056	f	2026-04-12 23:42:40.057	2026-04-12 23:42:40.057	\N	\N	\N	{}	\N	f	2026-04-12 23:42:40.056	2-months	2026-06-11 23:42:40.056	\N
cmnwese480009qrr4odmn1z0y	cmnwesb6z0004qrr48d1s3bgm	arb-phase7-1776037354396-2	cust-phase7-1776037354396-2	vip_quarterly	active	2026-07-11 23:42:40.056	f	2026-04-12 23:42:40.761	2026-04-12 23:42:40.761	\N	\N	\N	{}	\N	f	2026-04-12 23:42:40.056	3-months	2026-07-11 23:42:40.056	\N
cmnwesenr000bqrr4k6test6v	cmnwescdx0005qrr427cd1c3g	arb-phase7-1776037354396-3	cust-phase7-1776037354396-3	annual_platinum	canceled	2027-04-12 23:42:40.056	t	2026-04-12 23:42:41.463	2026-04-12 23:42:41.463	\N	\N	\N	{}	\N	f	2026-04-12 23:42:40.056	12-months	2027-04-12 23:42:40.056	\N
cmnweyeo80004145rffvmgzan	cmnweyaxe0000145rt4vy33dh	arb-phase7-1776037635380-1	cust-phase7-1776037635380-1	gold_bimonthly	active	2026-06-11 23:47:21.413	f	2026-04-12 23:47:21.416	2026-04-12 23:47:21.416	\N	\N	\N	{}	\N	f	2026-04-12 23:47:21.413	2-months	2026-06-11 23:47:21.413	\N
cmnweyf8t0007145ro4123se8	cmnweyc6b0001145r7wb76nhr	arb-phase7-1776037635380-2	cust-phase7-1776037635380-2	vip_quarterly	active	2026-07-11 23:47:21.413	f	2026-04-12 23:47:22.157	2026-04-12 23:47:22.157	\N	\N	\N	{}	\N	f	2026-04-12 23:47:21.413	3-months	2026-07-11 23:47:21.413	\N
cmnweyft80009145rmdl01pa0	cmnweydf80002145rv2lv88ok	arb-phase7-1776037635380-3	cust-phase7-1776037635380-3	annual_platinum	canceled	2027-04-12 23:47:21.413	t	2026-04-12 23:47:22.892	2026-04-12 23:47:22.892	\N	\N	\N	{}	\N	f	2026-04-12 23:47:21.413	12-months	2027-04-12 23:47:21.413	\N
\.


--
-- TOC entry 4990 (class 0 OID 19307)
-- Dependencies: 381
-- Data for Name: team_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_invitations (id, employer_id, email, role, invited_by, invitation_token, expires_at, accepted_at, created_at, updated_at, message, clerk_invitation_id) FROM stdin;
\.


--
-- TOC entry 4988 (class 0 OID 19286)
-- Dependencies: 379
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_members (id, employer_id, user_id, email, name, role, status, invited_by, invited_at, joined_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4989 (class 0 OID 19297)
-- Dependencies: 380
-- Data for Name: user_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_invitations (id, email, role, full_name, invited_by, invitation_token, expires_at, accepted_at, created_at, updated_at, message, clerk_invitation_id, pending_package_type, pending_billing_cycles, pending_amount_cents) FROM stdin;
121377d3-6c84-47f0-8a35-08fcee4c2b9d	jest_exclusive_plan_user_eligibility_b1_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_meg1pogo85	2026-05-12 23:47:22.298+00	\N	2026-04-12 23:47:22.3+00	2026-04-12 23:47:24.52+00	\N	\N	\N	\N	\N
f583c902-6f0b-45fb-8fc3-4f7637d32611	jest_exclusive_plan_user_eligibility_b3_1776037638243@test.com	employer	Test Invitee No Package	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_no_pkg_1776037638243_a8n4c0dqb2o	2026-05-12 23:47:29.876+00	\N	2026-04-12 23:47:29.877+00	2026-04-12 23:47:29.877+00	\N	\N	\N	\N	\N
c3efb04a-428b-4eef-a4ed-7dd5bfa5f093	jest_exclusive_plan_user_offer_c1_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_l5mfl2sloss	2026-05-12 23:47:32.825+00	\N	2026-04-12 23:47:32.826+00	2026-04-12 23:47:35.049+00	\N	\N	\N	\N	\N
cda976cb-10fb-4f81-a0f5-83e2315566db	jest_exclusive_plan_user_dismiss_d1_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_3u2arlcmy78	2026-05-12 23:47:40.183+00	\N	2026-04-12 23:47:40.184+00	2026-04-12 23:47:42.384+00	\N	\N	\N	\N	\N
cbd88aac-4d94-455a-9d85-535cceccead7	jest_exclusive_plan_user_activate_e1_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_v8p62i6li2	2026-05-12 23:47:45.35+00	\N	2026-04-12 23:47:45.351+00	2026-04-12 23:47:47.562+00	\N	\N	\N	\N	\N
c086b31d-895c-4845-aa04-b403d54a03c2	jest_exclusive_plan_user_activate_e2_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_kbens9mlok8	2026-05-12 23:47:50.193+00	\N	2026-04-12 23:47:50.194+00	2026-04-12 23:47:52.536+00	\N	\N	\N	\N	\N
9bc3f1d7-5e7e-48e3-a481-28576c6a32ff	jest_exclusive_plan_user_edge_f2_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_vpmqdw4jmg	2026-05-12 23:47:58.628+00	\N	2026-04-12 23:47:58.629+00	2026-04-12 23:48:00.985+00	\N	\N	\N	\N	\N
54746878-6507-45c3-abd5-57b3c365ebfb	jest_exclusive_plan_user_cancel_g1_1776037638243@test.com	employer	Test Invitee	cmnweyesh0004463anjqjv5wr	JEST_EXCLUSIVE_PLAN_token_1776037638243_5pcy8nw49iw	2026-05-12 23:48:03.625+00	\N	2026-04-12 23:48:03.626+00	2026-04-12 23:48:05.821+00	\N	\N	\N	\N	\N
\.


--
-- TOC entry 4967 (class 0 OID 19047)
-- Dependencies: 358
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, stack_user_id, role, name, phone, timezone, created_at, updated_at, email, profile_picture_url, first_name, last_name, concierge_bio, concierge_title, concierge_specialties, concierge_experience, is_active_concierge, tags, clerk_user_id, legacy_id, allow_direct_messages, message_notification_email, message_notification_in_app, is_active) FROM stdin;
cmnwury8c0002iljhg0pk5s2a	\N	seeker	Fifteen Seeker	\N	America/Chicago	2026-04-13 07:10:14.028	2026-04-13 07:10:14.028	mir23wpurposes+15@gmail.com	\N	Fifteen	Seeker	\N	\N	\N	\N	f	{}	user_3CIDMM9b1AqCHvf6lntjOPkcjLv	\N	t	t	t	t
cmnwux1ev0008iljhi0qe6795	\N	employer	Sixteen Seeker	\N	America/Chicago	2026-04-13 07:14:11.432	2026-04-13 07:14:11.432	mir23wpurposes+16@gmail.com	\N	Sixteen	Seeker	\N	\N	\N	\N	f	{}	user_3CIDuxrNxqu1rl7reVE5pXkfw8j	\N	t	t	t	t
cmnvrbzxy0003sl1u570m3ict	\N	seeker	Second Seeker	\N	America/Chicago	2026-04-12 12:46:04.726	2026-04-12 12:46:04.726	mir23wpurposes+2@gmail.com	\N	Second	Seeker	\N	\N	\N	\N	f	{}	user_3CG36HTuCT4BKvsqTBzFjmp9YWo	\N	t	t	t	t
cmnvruw8000017rljwt7y5297	\N	seeker	fourth Seeker	\N	America/Chicago	2026-04-12 13:00:46.368	2026-04-12 13:00:46.368	mir23wpurposes+4@gmail.com	\N	fourth	Seeker	\N	\N	\N	\N	f	{}	user_3CG4sGMpHq8gN2YwhLLm6qWM0zx	\N	t	t	t	t
cmnvsdo340001fcdraw8t399a	\N	seeker	Five Seeker	\N	America/Chicago	2026-04-12 13:15:22.288	2026-04-12 13:15:22.288	mir23wpurposes+5@gmail.com	\N	Five	Seeker	\N	\N	\N	\N	f	{}	user_3CG6cxgGriRSYFSIi9rnwBm6mO9	\N	t	t	t	t
cmnvswbbg0002556wfjr1yc2y	\N	seeker	Nine Seeker	\N	America/Chicago	2026-04-12 13:29:52.204	2026-04-12 13:29:52.204	mir23wpurposes+9@gmail.com	\N	Nine	Seeker	\N	\N	\N	\N	f	{}	user_3CG8QE4P8h5HnQ7Kxx5QBDrQjdK	\N	t	t	t	t
cmnvt0qbr000a556wmmicigzn	\N	seeker	Ten Seeker	\N	America/Chicago	2026-04-12 13:33:18.28	2026-04-12 13:33:18.28	mir23wpurposes+10@gmail.com	\N	Ten	Seeker	\N	\N	\N	\N	f	{}	user_3CG8lmuzGwj9sm4d8jm0hfHzUe0	\N	t	t	t	t
cmnvtfzzq000012305tumy8uw	\N	seeker	Twelve Seeker	\N	America/Chicago	2026-04-12 13:45:10.646	2026-04-12 13:45:10.646	mir23wpurposes+12@gmail.com	\N	Twelve	Seeker	\N	\N	\N	\N	f	{}	user_3CG9rQ0CwtMQOUntXS20tf2U3Aj	\N	t	t	t	t
cmnvtj6z900071230bi299cpe	\N	seeker	Thirteen Seeker	\N	America/Chicago	2026-04-12 13:47:39.669	2026-04-12 13:47:39.669	mir23wpurposes+13@gmail.com	\N	Thirteen	Seeker	\N	\N	\N	\N	f	{}	user_3CGAaI9Sl1lMRdfNSHGh4WKnCw9	\N	t	t	t	t
cmnwdb60t0001qnzvztx96b36	\N	employer	First Employer	\N	America/Chicago	2026-04-12 23:01:17.501	2026-04-12 23:01:17.501	mir23wpurposes+14@gmail.com	\N	First	Employer	\N	\N	\N	\N	f	{}	user_3CHFzGF6C7ugB3IzwHtY2XbxfOK	\N	t	t	t	t
cmnwes9zv0003qrr4wqwjc7ps	\N	seeker	Phase7 Test Seeker 1 1776037354396	\N	America/Chicago	2026-04-12 23:42:35.42	2026-04-12 23:42:35.42	phase7-seeker1-1776037354396@test.com	\N	Phase7Test	Seeker1	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnwesb6z0004qrr48d1s3bgm	\N	seeker	Phase7 Test Seeker 2 1776037354396	\N	America/Chicago	2026-04-12 23:42:36.971	2026-04-12 23:42:36.971	phase7-seeker2-1776037354396@test.com	\N	Phase7Test	Seeker2	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnwescdx0005qrr427cd1c3g	\N	seeker	Phase7 Test Seeker 3 1776037354396	\N	America/Chicago	2026-04-12 23:42:38.518	2026-04-12 23:42:38.518	phase7-seeker3-1776037354396@test.com	\N	Phase7Test	Seeker3	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnwet34i0013u7fwez6xtmy0	\N	employer	Test Employer Integration	\N	America/Chicago	2026-04-12 23:43:13.171	2026-04-12 23:43:13.171	\N	\N	\N	\N	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnweyaxe0000145rt4vy33dh	\N	seeker	Phase7 Test Seeker 1 1776037635380	\N	America/Chicago	2026-04-12 23:47:16.562	2026-04-12 23:47:16.562	phase7-seeker1-1776037635380@test.com	\N	Phase7Test	Seeker1	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnweyc6b0001145r7wb76nhr	\N	seeker	Phase7 Test Seeker 2 1776037635380	\N	America/Chicago	2026-04-12 23:47:18.18	2026-04-12 23:47:18.18	phase7-seeker2-1776037635380@test.com	\N	Phase7Test	Seeker2	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnweydf80002145rv2lv88ok	\N	seeker	Phase7 Test Seeker 3 1776037635380	\N	America/Chicago	2026-04-12 23:47:19.796	2026-04-12 23:47:19.796	phase7-seeker3-1776037635380@test.com	\N	Phase7Test	Seeker3	\N	\N	\N	\N	f	{}	\N	\N	t	t	t	t
cmnweydns0003463ake1gf7kz	\N	employer	Test User eligibility_b1	\N	America/Chicago	2026-04-12 23:47:20.105	2026-04-12 23:47:20.105	jest_exclusive_plan_user_eligibility_b1_1776037638243@test.com	\N	Test	eligibility_b1	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_eligibility_b1_1776037638243	\N	t	t	t	t
cmnweyesh0004463anjqjv5wr	\N	admin	Test Admin	\N	America/Chicago	2026-04-12 23:47:21.569	2026-04-12 23:47:21.569	jest_exclusive_plan_admin_1776037638243@test.com	\N	Test	Admin	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_admin_clerk_1776037638243	\N	t	t	t	t
cmnweyicj0005463aqqnrzd78	\N	employer	Test User eligibility_b2	\N	America/Chicago	2026-04-12 23:47:25.117	2026-04-12 23:47:25.117	jest_exclusive_plan_user_eligibility_b2_1776037638243@test.com	\N	Test	eligibility_b2	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_eligibility_b2_1776037638243	\N	t	t	t	t
cmnweyk2g0006463anbpwt9md	\N	employer	Test User eligibility_b3	\N	America/Chicago	2026-04-12 23:47:28.408	2026-04-12 23:47:28.408	jest_exclusive_plan_user_eligibility_b3_1776037638243@test.com	\N	Test	eligibility_b3	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_eligibility_b3_1776037638243	\N	t	t	t	t
cmnweymcf0007463abvrppouf	\N	employer	Test User offer_c1	\N	America/Chicago	2026-04-12 23:47:31.359	2026-04-12 23:47:31.359	jest_exclusive_plan_user_offer_c1_1776037638243@test.com	\N	Test	offer_c1	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_offer_c1_1776037638243	\N	t	t	t	t
cmnweyqbh0008463amnc18tjz	\N	employer	Test User offer_c2	\N	America/Chicago	2026-04-12 23:47:36.363	2026-04-12 23:47:36.363	jest_exclusive_plan_user_offer_c2_1776037638243@test.com	\N	Test	offer_c2	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_offer_c2_1776037638243	\N	t	t	t	t
cmnweys0t0009463atmxwwoek	\N	employer	Test User dismiss_d1	\N	America/Chicago	2026-04-12 23:47:38.717	2026-04-12 23:47:38.717	jest_exclusive_plan_user_dismiss_d1_1776037638243@test.com	\N	Test	dismiss_d1	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_dismiss_d1_1776037638243	\N	t	t	t	t
cmnweyvzy000a463awsr5k50u	\N	employer	Test User activate_e1	\N	America/Chicago	2026-04-12 23:47:43.722	2026-04-12 23:47:43.722	jest_exclusive_plan_user_activate_e1_1776037638243@test.com	\N	Test	activate_e1	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_activate_e1_1776037638243	\N	t	t	t	t
cmnweyzqu000d463aia3y1ba7	\N	employer	Test User activate_e2	\N	America/Chicago	2026-04-12 23:47:48.727	2026-04-12 23:47:48.727	jest_exclusive_plan_user_activate_e2_1776037638243@test.com	\N	Test	activate_e2	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_activate_e2_1776037638243	\N	t	t	t	t
cmnwez690000s463a123w25dg	\N	employer	Test User edge_f2	\N	America/Chicago	2026-04-12 23:47:57.156	2026-04-12 23:47:57.156	jest_exclusive_plan_user_edge_f2_1776037638243@test.com	\N	Test	edge_f2	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_edge_f2_1776037638243	\N	t	t	t	t
cmnweza41000z463aqdrimbay	\N	employer	Test User cancel_g1	\N	America/Chicago	2026-04-12 23:48:02.161	2026-04-12 23:48:02.161	jest_exclusive_plan_user_cancel_g1_1776037638243@test.com	\N	Test	cancel_g1	\N	\N	\N	\N	f	{}	JEST_EXCLUSIVE_PLAN_clerk_cancel_g1_1776037638243	\N	t	t	t	t
\.


--
-- TOC entry 4956 (class 0 OID 17160)
-- Dependencies: 343
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-04-01 10:09:20
20211116045059	2026-04-01 10:09:20
20211116050929	2026-04-01 10:09:20
20211116051442	2026-04-01 10:09:20
20211116212300	2026-04-01 10:09:20
20211116213355	2026-04-01 10:09:20
20211116213934	2026-04-01 10:09:21
20211116214523	2026-04-01 10:09:21
20211122062447	2026-04-01 10:09:21
20211124070109	2026-04-01 10:09:21
20211202204204	2026-04-01 10:09:21
20211202204605	2026-04-01 10:09:21
20211210212804	2026-04-01 10:09:21
20211228014915	2026-04-01 10:09:21
20220107221237	2026-04-01 10:09:21
20220228202821	2026-04-01 10:09:21
20220312004840	2026-04-01 10:09:21
20220603231003	2026-04-01 10:09:21
20220603232444	2026-04-01 10:09:21
20220615214548	2026-04-01 10:09:21
20220712093339	2026-04-01 10:09:21
20220908172859	2026-04-01 10:09:21
20220916233421	2026-04-01 10:09:21
20230119133233	2026-04-01 10:09:21
20230128025114	2026-04-01 10:09:21
20230128025212	2026-04-01 10:09:21
20230227211149	2026-04-01 10:09:21
20230228184745	2026-04-01 10:09:21
20230308225145	2026-04-01 10:09:21
20230328144023	2026-04-01 10:09:21
20231018144023	2026-04-01 10:09:21
20231204144023	2026-04-01 10:09:21
20231204144024	2026-04-01 10:09:21
20231204144025	2026-04-01 10:09:21
20240108234812	2026-04-01 10:09:21
20240109165339	2026-04-01 10:09:21
20240227174441	2026-04-01 12:07:50
20240311171622	2026-04-01 12:07:50
20240321100241	2026-04-01 12:07:50
20240401105812	2026-04-01 12:07:51
20240418121054	2026-04-01 12:07:51
20240523004032	2026-04-01 12:07:51
20240618124746	2026-04-01 12:07:51
20240801235015	2026-04-01 12:07:51
20240805133720	2026-04-01 12:07:51
20240827160934	2026-04-01 12:07:51
20240919163303	2026-04-01 12:07:51
20240919163305	2026-04-01 12:07:51
20241019105805	2026-04-01 12:07:51
20241030150047	2026-04-01 12:07:51
20241108114728	2026-04-01 12:07:51
20241121104152	2026-04-01 12:07:52
20241130184212	2026-04-01 12:07:52
20241220035512	2026-04-01 12:07:52
20241220123912	2026-04-01 12:07:52
20241224161212	2026-04-01 12:07:52
20250107150512	2026-04-01 12:07:52
20250110162412	2026-04-01 12:07:52
20250123174212	2026-04-01 12:07:52
20250128220012	2026-04-01 12:07:52
20250506224012	2026-04-01 12:07:52
20250523164012	2026-04-01 12:07:52
20250714121412	2026-04-01 12:07:52
20250905041441	2026-04-01 12:07:52
20251103001201	2026-04-01 12:07:52
20251120212548	2026-04-01 12:07:52
20251120215549	2026-04-01 12:07:52
20260218120000	2026-04-01 12:07:52
20260326120000	2026-04-11 08:13:35
\.


--
-- TOC entry 4958 (class 0 OID 17183)
-- Dependencies: 346
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- TOC entry 4960 (class 0 OID 17282)
-- Dependencies: 350
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
resumes	resumes	\N	2026-04-01 12:21:07.508938+00	2026-04-01 12:21:07.508938+00	f	f	\N	\N	\N	STANDARD
profile-pictures	profile-pictures	\N	2026-04-01 12:21:25.027892+00	2026-04-01 12:21:25.027892+00	f	f	\N	\N	\N	STANDARD
company-logos	company-logos	\N	2026-04-01 12:21:34.031073+00	2026-04-01 12:21:34.031073+00	f	f	\N	\N	\N	STANDARD
attachments	attachments	\N	2026-04-01 12:21:43.590875+00	2026-04-01 12:21:43.590875+00	f	f	\N	\N	\N	STANDARD
\.


--
-- TOC entry 4964 (class 0 OID 17402)
-- Dependencies: 354
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- TOC entry 4965 (class 0 OID 17415)
-- Dependencies: 355
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4959 (class 0 OID 17274)
-- Dependencies: 349
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-04-01 10:09:47.732498
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-04-01 10:09:47.772637
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-04-01 10:09:47.779788
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-04-01 10:09:47.809774
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-04-01 10:09:47.842197
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-04-01 10:09:47.846944
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-04-01 10:09:47.852416
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-04-01 10:09:47.857757
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-04-01 10:09:47.862311
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-04-01 10:09:47.867254
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-04-01 10:09:47.872204
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-04-01 10:09:47.877439
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-04-01 10:09:47.883592
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-04-01 10:09:47.888777
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-04-01 10:09:47.893848
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-04-01 10:09:47.92083
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-04-01 10:09:47.927044
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-04-01 10:09:47.931912
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-04-01 10:09:47.936739
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-04-01 10:09:47.943777
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-04-01 10:09:47.948714
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-04-01 10:09:47.954427
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-04-01 10:09:47.968982
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-04-01 10:09:47.979728
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-04-01 10:09:47.985127
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-04-01 10:09:47.99021
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-04-01 10:09:47.996216
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-04-01 10:09:48.000996
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-04-01 10:09:48.005776
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-04-01 10:09:48.01039
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-04-01 10:09:48.014957
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-04-01 10:09:48.019445
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-04-01 10:09:48.023975
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-04-01 10:09:48.028407
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-04-01 10:09:48.032904
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-04-01 10:09:48.037291
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-04-01 10:09:48.041803
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-04-01 10:09:48.046343
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-04-01 10:09:48.051754
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-04-01 10:09:48.062833
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-04-01 10:09:48.067343
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-04-01 10:09:48.071761
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-04-01 10:09:48.076176
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-04-01 10:09:48.080808
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-04-01 10:09:48.085416
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-04-01 10:09:48.090682
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-04-01 10:09:48.102798
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-04-01 10:09:48.107898
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-04-01 10:09:48.112412
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-04-01 10:09:48.128223
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-04-01 10:09:48.133437
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-04-01 10:09:48.614536
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-04-01 10:09:48.616681
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-04-01 10:09:48.629444
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-04-01 10:09:48.632547
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-04-01 10:09:48.634497
56	fix-optimized-search-function	cb58526ebc23048049fd5bf2fd148d18b04a2073	2026-04-01 10:09:48.640651
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-04-08 07:59:26.261357
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-04-08 07:59:26.566208
\.


--
-- TOC entry 4961 (class 0 OID 17292)
-- Dependencies: 351
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- TOC entry 4962 (class 0 OID 17341)
-- Dependencies: 352
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- TOC entry 4963 (class 0 OID 17355)
-- Dependencies: 353
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- TOC entry 4966 (class 0 OID 17425)
-- Dependencies: 356
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3949 (class 0 OID 16612)
-- Dependencies: 322
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 317
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 398
-- Name: migration_state_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migration_state_id_seq', 1, false);


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 345
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- TOC entry 4313 (class 2606 OID 16783)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 4282 (class 2606 OID 16535)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4368 (class 2606 OID 17115)
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- TOC entry 4370 (class 2606 OID 17113)
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4336 (class 2606 OID 16889)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 4291 (class 2606 OID 16907)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 4293 (class 2606 OID 16917)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 4280 (class 2606 OID 16528)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 4315 (class 2606 OID 16776)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 4311 (class 2606 OID 16764)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4303 (class 2606 OID 16957)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 4305 (class 2606 OID 16751)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 4349 (class 2606 OID 17016)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- TOC entry 4351 (class 2606 OID 17014)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- TOC entry 4353 (class 2606 OID 17012)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4363 (class 2606 OID 17074)
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4346 (class 2606 OID 16976)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4357 (class 2606 OID 17038)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 4359 (class 2606 OID 17040)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- TOC entry 4340 (class 2606 OID 16942)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4274 (class 2606 OID 16518)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4277 (class 2606 OID 16694)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 4325 (class 2606 OID 16823)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 4327 (class 2606 OID 16821)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4332 (class 2606 OID 16837)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4285 (class 2606 OID 16541)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4298 (class 2606 OID 16715)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4322 (class 2606 OID 16804)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 4317 (class 2606 OID 16795)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4267 (class 2606 OID 16877)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4269 (class 2606 OID 16505)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4378 (class 2606 OID 17152)
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4374 (class 2606 OID 17135)
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- TOC entry 4645 (class 2606 OID 19574)
-- Name: action_logs action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4586 (class 2606 OID 19441)
-- Name: additional_service_purchases additional_service_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT additional_service_purchases_pkey PRIMARY KEY (id);


--
-- TOC entry 4594 (class 2606 OID 19453)
-- Name: additional_services additional_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_services
    ADD CONSTRAINT additional_services_pkey PRIMARY KEY (id);


--
-- TOC entry 4474 (class 2606 OID 19224)
-- Name: admin_actions_log admin_actions_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions_log
    ADD CONSTRAINT admin_actions_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4626 (class 2606 OID 19526)
-- Name: app_fields app_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_fields
    ADD CONSTRAINT app_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 4442 (class 2606 OID 19143)
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- TOC entry 4453 (class 2606 OID 19174)
-- Name: cancellation_surveys cancellation_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_surveys
    ADD CONSTRAINT cancellation_surveys_pkey PRIMARY KEY (id);


--
-- TOC entry 4486 (class 2606 OID 19251)
-- Name: concierge_chat_messages concierge_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chat_messages
    ADD CONSTRAINT concierge_chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4481 (class 2606 OID 19242)
-- Name: concierge_chats concierge_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chats
    ADD CONSTRAINT concierge_chats_pkey PRIMARY KEY (id);


--
-- TOC entry 4476 (class 2606 OID 19233)
-- Name: concierge_requests concierge_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_requests
    ADD CONSTRAINT concierge_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4502 (class 2606 OID 19285)
-- Name: cover_letter_templates cover_letter_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_templates
    ADD CONSTRAINT cover_letter_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4614 (class 2606 OID 19492)
-- Name: crm_sync_change_logs crm_sync_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_sync_change_logs
    ADD CONSTRAINT crm_sync_change_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4637 (class 2606 OID 19553)
-- Name: crm_sync_logs crm_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_sync_logs
    ADD CONSTRAINT crm_sync_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4618 (class 2606 OID 19507)
-- Name: crm_sync_settings crm_sync_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_sync_settings
    ADD CONSTRAINT crm_sync_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4554 (class 2606 OID 19371)
-- Name: email_blast_requests email_blast_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_blast_requests
    ADD CONSTRAINT email_blast_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4430 (class 2606 OID 19110)
-- Name: employer_packages employer_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employer_packages
    ADD CONSTRAINT employer_packages_pkey PRIMARY KEY (id);


--
-- TOC entry 4428 (class 2606 OID 19096)
-- Name: employers employers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4640 (class 2606 OID 19565)
-- Name: execution_logs execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_logs
    ADD CONSTRAINT execution_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4533 (class 2606 OID 19341)
-- Name: external_payments external_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_payments
    ADD CONSTRAINT external_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4547 (class 2606 OID 19360)
-- Name: featured_job_requests featured_job_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_job_requests
    ADD CONSTRAINT featured_job_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4628 (class 2606 OID 19535)
-- Name: field_groups field_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_groups
    ADD CONSTRAINT field_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 4633 (class 2606 OID 19545)
-- Name: field_mappings field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_mappings
    ADD CONSTRAINT field_mappings_pkey PRIMARY KEY (id);


--
-- TOC entry 4622 (class 2606 OID 19516)
-- Name: ghl_fields ghl_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghl_fields
    ADD CONSTRAINT ghl_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 4447 (class 2606 OID 19153)
-- Name: interview_history interview_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_history
    ADD CONSTRAINT interview_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4469 (class 2606 OID 19205)
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- TOC entry 4426 (class 2606 OID 19086)
-- Name: job_seekers job_seekers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_seekers
    ADD CONSTRAINT job_seekers_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4440 (class 2606 OID 19134)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4572 (class 2606 OID 19401)
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 4582 (class 2606 OID 19430)
-- Name: message_drafts message_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_drafts
    ADD CONSTRAINT message_drafts_pkey PRIMARY KEY (id);


--
-- TOC entry 4579 (class 2606 OID 19422)
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4576 (class 2606 OID 19411)
-- Name: message_threads message_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_pkey PRIMARY KEY (id);


--
-- TOC entry 4566 (class 2606 OID 19393)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4610 (class 2606 OID 19484)
-- Name: migration_state migration_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_state
    ADD CONSTRAINT migration_state_pkey PRIMARY KEY (id);


--
-- TOC entry 4519 (class 2606 OID 19325)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4471 (class 2606 OID 19216)
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- TOC entry 4541 (class 2606 OID 19349)
-- Name: pending_job_posts pending_job_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_job_posts
    ADD CONSTRAINT pending_job_posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4528 (class 2606 OID 19333)
-- Name: pending_signups pending_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_signups
    ADD CONSTRAINT pending_signups_pkey PRIMARY KEY (id);


--
-- TOC entry 4606 (class 2606 OID 19471)
-- Name: purchased_add_ons purchased_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchased_add_ons
    ADD CONSTRAINT purchased_add_ons_pkey PRIMARY KEY (id);


--
-- TOC entry 4467 (class 2606 OID 19196)
-- Name: resume_critiques resume_critiques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_critiques
    ADD CONSTRAINT resume_critiques_pkey PRIMARY KEY (id);


--
-- TOC entry 4560 (class 2606 OID 19382)
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- TOC entry 4499 (class 2606 OID 19276)
-- Name: saved_jobs saved_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4496 (class 2606 OID 19268)
-- Name: seeker_concierge_chat_messages seeker_concierge_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chat_messages
    ADD CONSTRAINT seeker_concierge_chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4491 (class 2606 OID 19259)
-- Name: seeker_concierge_chats seeker_concierge_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chats
    ADD CONSTRAINT seeker_concierge_chats_pkey PRIMARY KEY (id);


--
-- TOC entry 4602 (class 2606 OID 19462)
-- Name: service_request_audits service_request_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_request_audits
    ADD CONSTRAINT service_request_audits_pkey PRIMARY KEY (id);


--
-- TOC entry 4462 (class 2606 OID 19183)
-- Name: subscription_cancellation_logs subscription_cancellation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_cancellation_logs
    ADD CONSTRAINT subscription_cancellation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4451 (class 2606 OID 19165)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4516 (class 2606 OID 19315)
-- Name: team_invitations team_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_pkey PRIMARY KEY (id);


--
-- TOC entry 4506 (class 2606 OID 19296)
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- TOC entry 4511 (class 2606 OID 19306)
-- Name: user_invitations user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);


--
-- TOC entry 4420 (class 2606 OID 19061)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4414 (class 2606 OID 17528)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4384 (class 2606 OID 17191)
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- TOC entry 4381 (class 2606 OID 17164)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4405 (class 2606 OID 17448)
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 4392 (class 2606 OID 17290)
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- TOC entry 4408 (class 2606 OID 17424)
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- TOC entry 4387 (class 2606 OID 17281)
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- TOC entry 4389 (class 2606 OID 17279)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4398 (class 2606 OID 17302)
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- TOC entry 4403 (class 2606 OID 17364)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- TOC entry 4401 (class 2606 OID 17349)
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- TOC entry 4411 (class 2606 OID 17434)
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- TOC entry 4283 (class 1259 OID 16536)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 4257 (class 1259 OID 16704)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4364 (class 1259 OID 17119)
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- TOC entry 4365 (class 1259 OID 17118)
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- TOC entry 4366 (class 1259 OID 17116)
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- TOC entry 4371 (class 1259 OID 17117)
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- TOC entry 4258 (class 1259 OID 16706)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4259 (class 1259 OID 16707)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4301 (class 1259 OID 16785)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 4334 (class 1259 OID 16893)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 4289 (class 1259 OID 16873)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 5066 (class 0 OID 0)
-- Dependencies: 4289
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 4294 (class 1259 OID 16701)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 4337 (class 1259 OID 16890)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4361 (class 1259 OID 17075)
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- TOC entry 4338 (class 1259 OID 16891)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 4309 (class 1259 OID 16896)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 4306 (class 1259 OID 16757)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 4307 (class 1259 OID 16902)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 4347 (class 1259 OID 17027)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- TOC entry 4344 (class 1259 OID 16980)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 4354 (class 1259 OID 17053)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4355 (class 1259 OID 17051)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4360 (class 1259 OID 17052)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- TOC entry 4341 (class 1259 OID 16949)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 4342 (class 1259 OID 16948)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 4343 (class 1259 OID 16950)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 4260 (class 1259 OID 16708)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4261 (class 1259 OID 16705)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4270 (class 1259 OID 16519)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 4271 (class 1259 OID 16520)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 4272 (class 1259 OID 16700)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 4275 (class 1259 OID 16787)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 4278 (class 1259 OID 16892)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 4328 (class 1259 OID 16829)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 4329 (class 1259 OID 16894)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 4330 (class 1259 OID 16844)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 4333 (class 1259 OID 16843)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 4295 (class 1259 OID 16895)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 4296 (class 1259 OID 17065)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- TOC entry 4299 (class 1259 OID 16786)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 4320 (class 1259 OID 16811)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 4323 (class 1259 OID 16810)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 4318 (class 1259 OID 16796)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 4319 (class 1259 OID 16958)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 4308 (class 1259 OID 16955)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 4300 (class 1259 OID 16784)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 4262 (class 1259 OID 16864)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 5067 (class 0 OID 0)
-- Dependencies: 4262
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 4263 (class 1259 OID 16702)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 4264 (class 1259 OID 16509)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 4265 (class 1259 OID 16919)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4376 (class 1259 OID 17159)
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- TOC entry 4379 (class 1259 OID 17158)
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- TOC entry 4372 (class 1259 OID 17141)
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- TOC entry 4375 (class 1259 OID 17142)
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- TOC entry 4651 (class 1259 OID 19716)
-- Name: _PackageJobs_AB_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "_PackageJobs_AB_unique" ON public."_PackageJobs" USING btree ("A", "B");


--
-- TOC entry 4652 (class 1259 OID 19717)
-- Name: _PackageJobs_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_PackageJobs_B_index" ON public."_PackageJobs" USING btree ("B");


--
-- TOC entry 4595 (class 1259 OID 19684)
-- Name: additional_services_service_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX additional_services_service_id_key ON public.additional_services USING btree (service_id);


--
-- TOC entry 4623 (class 1259 OID 19700)
-- Name: app_fields_field_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX app_fields_field_key_key ON public.app_fields USING btree (field_key);


--
-- TOC entry 4624 (class 1259 OID 19701)
-- Name: app_fields_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_fields_group_id_idx ON public.app_fields USING btree (group_id);


--
-- TOC entry 4483 (class 1259 OID 19616)
-- Name: concierge_chat_messages_chat_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chat_messages_chat_id_idx ON public.concierge_chat_messages USING btree (chat_id);


--
-- TOC entry 4484 (class 1259 OID 19618)
-- Name: concierge_chat_messages_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chat_messages_created_at_idx ON public.concierge_chat_messages USING btree (created_at);


--
-- TOC entry 4487 (class 1259 OID 19617)
-- Name: concierge_chat_messages_sender_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chat_messages_sender_id_idx ON public.concierge_chat_messages USING btree (sender_id);


--
-- TOC entry 4477 (class 1259 OID 19614)
-- Name: concierge_chats_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chats_admin_id_idx ON public.concierge_chats USING btree (admin_id);


--
-- TOC entry 4478 (class 1259 OID 19613)
-- Name: concierge_chats_employer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chats_employer_id_idx ON public.concierge_chats USING btree (employer_id);


--
-- TOC entry 4479 (class 1259 OID 19612)
-- Name: concierge_chats_job_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chats_job_id_idx ON public.concierge_chats USING btree (job_id);


--
-- TOC entry 4482 (class 1259 OID 19615)
-- Name: concierge_chats_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX concierge_chats_status_idx ON public.concierge_chats USING btree (status);


--
-- TOC entry 4611 (class 1259 OID 19695)
-- Name: crm_sync_change_logs_action_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_sync_change_logs_action_type_idx ON public.crm_sync_change_logs USING btree (action_type);


--
-- TOC entry 4612 (class 1259 OID 19696)
-- Name: crm_sync_change_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_sync_change_logs_created_at_idx ON public.crm_sync_change_logs USING btree (created_at);


--
-- TOC entry 4615 (class 1259 OID 19694)
-- Name: crm_sync_change_logs_super_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_sync_change_logs_super_admin_id_idx ON public.crm_sync_change_logs USING btree (super_admin_id);


--
-- TOC entry 4634 (class 1259 OID 19707)
-- Name: crm_sync_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_sync_logs_created_at_idx ON public.crm_sync_logs USING btree (created_at);


--
-- TOC entry 4635 (class 1259 OID 19705)
-- Name: crm_sync_logs_mapping_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_sync_logs_mapping_id_idx ON public.crm_sync_logs USING btree (mapping_id);


--
-- TOC entry 4638 (class 1259 OID 19706)
-- Name: crm_sync_logs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_sync_logs_status_idx ON public.crm_sync_logs USING btree (status);


--
-- TOC entry 4616 (class 1259 OID 19697)
-- Name: crm_sync_settings_last_saved_by_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_sync_settings_last_saved_by_key ON public.crm_sync_settings USING btree (last_saved_by);


--
-- TOC entry 4550 (class 1259 OID 19658)
-- Name: email_blast_requests_employer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_blast_requests_employer_id_idx ON public.email_blast_requests USING btree (employer_id);


--
-- TOC entry 4551 (class 1259 OID 19661)
-- Name: email_blast_requests_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_blast_requests_expires_at_idx ON public.email_blast_requests USING btree (expires_at);


--
-- TOC entry 4552 (class 1259 OID 19657)
-- Name: email_blast_requests_job_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_blast_requests_job_id_idx ON public.email_blast_requests USING btree (job_id);


--
-- TOC entry 4555 (class 1259 OID 19660)
-- Name: email_blast_requests_requested_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_blast_requests_requested_at_idx ON public.email_blast_requests USING btree (requested_at);


--
-- TOC entry 4556 (class 1259 OID 19659)
-- Name: email_blast_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_blast_requests_status_idx ON public.email_blast_requests USING btree (status);


--
-- TOC entry 4531 (class 1259 OID 19645)
-- Name: external_payments_ghl_transaction_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_payments_ghl_transaction_id_idx ON public.external_payments USING btree (ghl_transaction_id);


--
-- TOC entry 4534 (class 1259 OID 19646)
-- Name: external_payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_payments_status_idx ON public.external_payments USING btree (status);


--
-- TOC entry 4535 (class 1259 OID 19644)
-- Name: external_payments_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_payments_user_id_idx ON public.external_payments USING btree (user_id);


--
-- TOC entry 4544 (class 1259 OID 19654)
-- Name: featured_job_requests_employer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX featured_job_requests_employer_id_idx ON public.featured_job_requests USING btree (employer_id);


--
-- TOC entry 4545 (class 1259 OID 19653)
-- Name: featured_job_requests_job_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX featured_job_requests_job_id_idx ON public.featured_job_requests USING btree (job_id);


--
-- TOC entry 4548 (class 1259 OID 19656)
-- Name: featured_job_requests_requested_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX featured_job_requests_requested_at_idx ON public.featured_job_requests USING btree (requested_at);


--
-- TOC entry 4549 (class 1259 OID 19655)
-- Name: featured_job_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX featured_job_requests_status_idx ON public.featured_job_requests USING btree (status);


--
-- TOC entry 4629 (class 1259 OID 19704)
-- Name: field_mappings_ghl_field_id_app_field_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX field_mappings_ghl_field_id_app_field_id_key ON public.field_mappings USING btree (ghl_field_id, app_field_id);


--
-- TOC entry 4630 (class 1259 OID 19702)
-- Name: field_mappings_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_mappings_group_id_idx ON public.field_mappings USING btree (group_id);


--
-- TOC entry 4631 (class 1259 OID 19703)
-- Name: field_mappings_is_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_mappings_is_enabled_idx ON public.field_mappings USING btree (is_enabled);


--
-- TOC entry 4619 (class 1259 OID 19698)
-- Name: ghl_fields_ghl_field_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ghl_fields_ghl_field_id_key ON public.ghl_fields USING btree (ghl_field_id);


--
-- TOC entry 4620 (class 1259 OID 19699)
-- Name: ghl_fields_ghl_field_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ghl_fields_ghl_field_key_key ON public.ghl_fields USING btree (ghl_field_key);


--
-- TOC entry 4646 (class 1259 OID 19711)
-- Name: idx_action_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_logs_action_type ON public.action_logs USING btree (action_type);


--
-- TOC entry 4647 (class 1259 OID 19712)
-- Name: idx_action_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_logs_created_at ON public.action_logs USING btree (created_at DESC);


--
-- TOC entry 4648 (class 1259 OID 19713)
-- Name: idx_action_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_logs_entity ON public.action_logs USING btree (entity_type, entity_id);


--
-- TOC entry 4649 (class 1259 OID 19714)
-- Name: idx_action_logs_execution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_logs_execution_id ON public.action_logs USING btree (execution_id);


--
-- TOC entry 4650 (class 1259 OID 19715)
-- Name: idx_action_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_logs_status ON public.action_logs USING btree (status);


--
-- TOC entry 4587 (class 1259 OID 19678)
-- Name: idx_additional_service_purchases_employer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_service_purchases_employer_id ON public.additional_service_purchases USING btree (employer_id);


--
-- TOC entry 4588 (class 1259 OID 19683)
-- Name: idx_additional_service_purchases_employer_package_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_service_purchases_employer_package_id ON public.additional_service_purchases USING btree (employer_package_id);


--
-- TOC entry 4589 (class 1259 OID 19679)
-- Name: idx_additional_service_purchases_seeker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_service_purchases_seeker_id ON public.additional_service_purchases USING btree (seeker_id);


--
-- TOC entry 4590 (class 1259 OID 19680)
-- Name: idx_additional_service_purchases_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_service_purchases_service_id ON public.additional_service_purchases USING btree (service_id);


--
-- TOC entry 4591 (class 1259 OID 19681)
-- Name: idx_additional_service_purchases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_service_purchases_status ON public.additional_service_purchases USING btree (status);


--
-- TOC entry 4592 (class 1259 OID 19682)
-- Name: idx_additional_service_purchases_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_service_purchases_user_id ON public.additional_service_purchases USING btree (user_id);


--
-- TOC entry 4596 (class 1259 OID 19685)
-- Name: idx_additional_services_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_services_is_active ON public.additional_services USING btree (is_active);


--
-- TOC entry 4597 (class 1259 OID 19686)
-- Name: idx_additional_services_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_services_user_type ON public.additional_services USING btree (user_type);


--
-- TOC entry 4443 (class 1259 OID 19596)
-- Name: idx_applications_resume_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_resume_id ON public.applications USING btree (resume_id);


--
-- TOC entry 4454 (class 1259 OID 19603)
-- Name: idx_cancellation_survey_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cancellation_survey_created_at ON public.cancellation_surveys USING btree (created_at DESC);


--
-- TOC entry 4455 (class 1259 OID 19604)
-- Name: idx_cancellation_survey_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cancellation_survey_reason ON public.cancellation_surveys USING btree (primary_reason);


--
-- TOC entry 4456 (class 1259 OID 19601)
-- Name: idx_cancellation_survey_seeker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cancellation_survey_seeker_id ON public.cancellation_surveys USING btree (seeker_id);


--
-- TOC entry 4457 (class 1259 OID 19602)
-- Name: idx_cancellation_survey_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cancellation_survey_subscription_id ON public.cancellation_surveys USING btree (subscription_id);


--
-- TOC entry 4431 (class 1259 OID 19588)
-- Name: idx_employer_package_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employer_package_expires ON public.employer_packages USING btree (employer_id, expires_at);


--
-- TOC entry 4641 (class 1259 OID 19708)
-- Name: idx_execution_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_execution_logs_created_at ON public.execution_logs USING btree (created_at DESC);


--
-- TOC entry 4642 (class 1259 OID 19709)
-- Name: idx_execution_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_execution_logs_status ON public.execution_logs USING btree (status);


--
-- TOC entry 4643 (class 1259 OID 19710)
-- Name: idx_execution_logs_task_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_execution_logs_task_name ON public.execution_logs USING btree (task_name);


--
-- TOC entry 4432 (class 1259 OID 19593)
-- Name: idx_job_category_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_category_type ON public.jobs USING btree (category, type);


--
-- TOC entry 4433 (class 1259 OID 19590)
-- Name: idx_job_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_created_at ON public.jobs USING btree (created_at);


--
-- TOC entry 4434 (class 1259 OID 19592)
-- Name: idx_job_employer_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_employer_archived ON public.jobs USING btree (employer_id, is_archived);


--
-- TOC entry 4435 (class 1259 OID 19591)
-- Name: idx_job_employer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_employer_created ON public.jobs USING btree (employer_id, created_at);


--
-- TOC entry 4436 (class 1259 OID 19589)
-- Name: idx_job_employer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_employer_status ON public.jobs USING btree (employer_id, status);


--
-- TOC entry 4437 (class 1259 OID 19595)
-- Name: idx_job_employer_status_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_employer_status_expires ON public.jobs USING btree (employer_id, status, expires_at);


--
-- TOC entry 4438 (class 1259 OID 19594)
-- Name: idx_job_status_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_status_expires ON public.jobs USING btree (status, expires_at);


--
-- TOC entry 4422 (class 1259 OID 19585)
-- Name: idx_jobseeker_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobseeker_membership ON public.job_seekers USING btree (membership_plan, membership_expires_at);


--
-- TOC entry 4423 (class 1259 OID 19586)
-- Name: idx_jobseeker_skills_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobseeker_skills_gin ON public.job_seekers USING gin (skills);


--
-- TOC entry 4424 (class 1259 OID 19587)
-- Name: idx_jobseeker_visibility_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobseeker_visibility_updated ON public.job_seekers USING btree (profile_visibility, is_suspended, updated_at DESC);


--
-- TOC entry 4607 (class 1259 OID 19693)
-- Name: idx_migration_state_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_state_name ON public.migration_state USING btree (migration_name);


--
-- TOC entry 4536 (class 1259 OID 19651)
-- Name: idx_pending_job_posts_clerk_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_job_posts_clerk_user_id ON public.pending_job_posts USING btree (clerk_user_id);


--
-- TOC entry 4523 (class 1259 OID 19642)
-- Name: idx_pending_signups_clerk_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_signups_clerk_user_id ON public.pending_signups USING btree (clerk_user_id);


--
-- TOC entry 4603 (class 1259 OID 19691)
-- Name: idx_purchased_add_ons_add_on_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchased_add_ons_add_on_id ON public.purchased_add_ons USING btree ("addOnId");


--
-- TOC entry 4604 (class 1259 OID 19690)
-- Name: idx_purchased_add_ons_package_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchased_add_ons_package_id ON public.purchased_add_ons USING btree ("employerPackageId");


--
-- TOC entry 4463 (class 1259 OID 19608)
-- Name: idx_resume_critiques_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resume_critiques_requested_at ON public.resume_critiques USING btree (requested_at);


--
-- TOC entry 4464 (class 1259 OID 19609)
-- Name: idx_resume_critiques_seeker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resume_critiques_seeker_id ON public.resume_critiques USING btree (seeker_id);


--
-- TOC entry 4465 (class 1259 OID 19610)
-- Name: idx_resume_critiques_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resume_critiques_status ON public.resume_critiques USING btree (status);


--
-- TOC entry 4557 (class 1259 OID 19664)
-- Name: idx_resumes_seeker_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resumes_seeker_id_status ON public.resumes USING btree (seeker_id, status);


--
-- TOC entry 4598 (class 1259 OID 19688)
-- Name: idx_service_request_audit_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_request_audit_changed_by ON public.service_request_audits USING btree (changed_by);


--
-- TOC entry 4599 (class 1259 OID 19689)
-- Name: idx_service_request_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_request_audit_created_at ON public.service_request_audits USING btree (created_at);


--
-- TOC entry 4600 (class 1259 OID 19687)
-- Name: idx_service_request_audit_service_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_request_audit_service_request_id ON public.service_request_audits USING btree (service_request_id);


--
-- TOC entry 4458 (class 1259 OID 19606)
-- Name: idx_sub_cancel_logs_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_cancel_logs_admin ON public.subscription_cancellation_logs USING btree (admin_id);


--
-- TOC entry 4459 (class 1259 OID 19607)
-- Name: idx_sub_cancel_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_cancel_logs_created ON public.subscription_cancellation_logs USING btree (created_at DESC);


--
-- TOC entry 4460 (class 1259 OID 19605)
-- Name: idx_sub_cancel_logs_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_cancel_logs_subscription ON public.subscription_cancellation_logs USING btree (subscription_id);


--
-- TOC entry 4448 (class 1259 OID 19600)
-- Name: idx_subscriptions_current_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_current_period ON public.subscriptions USING btree (current_period_start, current_period_end);


--
-- TOC entry 4449 (class 1259 OID 19599)
-- Name: idx_subscriptions_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_tier ON public.subscriptions USING btree (tier);


--
-- TOC entry 4508 (class 1259 OID 19630)
-- Name: idx_user_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_invitations_email ON public.user_invitations USING btree (email);


--
-- TOC entry 4509 (class 1259 OID 19629)
-- Name: idx_user_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_invitations_token ON public.user_invitations USING btree (invitation_token);


--
-- TOC entry 4415 (class 1259 OID 19583)
-- Name: idx_user_profiles_clerk_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_clerk_user_id ON public.user_profiles USING btree (clerk_user_id);


--
-- TOC entry 4444 (class 1259 OID 19597)
-- Name: interview_history_application_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_history_application_id_idx ON public.interview_history USING btree (application_id);


--
-- TOC entry 4445 (class 1259 OID 19598)
-- Name: interview_history_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interview_history_created_at_idx ON public.interview_history USING btree (created_at);


--
-- TOC entry 4570 (class 1259 OID 19671)
-- Name: message_attachments_message_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_attachments_message_id_idx ON public.message_attachments USING btree (message_id);


--
-- TOC entry 4583 (class 1259 OID 19677)
-- Name: message_drafts_thread_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_drafts_thread_id_idx ON public.message_drafts USING btree (thread_id);


--
-- TOC entry 4584 (class 1259 OID 19676)
-- Name: message_drafts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_drafts_user_id_idx ON public.message_drafts USING btree (user_id);


--
-- TOC entry 4577 (class 1259 OID 19675)
-- Name: message_templates_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_templates_category_idx ON public.message_templates USING btree (category);


--
-- TOC entry 4580 (class 1259 OID 19674)
-- Name: message_templates_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_templates_user_id_idx ON public.message_templates USING btree (user_id);


--
-- TOC entry 4573 (class 1259 OID 19673)
-- Name: message_threads_last_message_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_threads_last_message_at_idx ON public.message_threads USING btree (last_message_at);


--
-- TOC entry 4574 (class 1259 OID 19672)
-- Name: message_threads_participants_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_threads_participants_idx ON public.message_threads USING btree (participants);


--
-- TOC entry 4562 (class 1259 OID 19667)
-- Name: messages_application_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_application_id_idx ON public.messages USING btree (application_id);


--
-- TOC entry 4563 (class 1259 OID 19670)
-- Name: messages_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_created_at_idx ON public.messages USING btree (created_at);


--
-- TOC entry 4564 (class 1259 OID 19668)
-- Name: messages_job_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_job_id_idx ON public.messages USING btree (job_id);


--
-- TOC entry 4567 (class 1259 OID 19666)
-- Name: messages_recipient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_recipient_id_idx ON public.messages USING btree (recipient_id);


--
-- TOC entry 4568 (class 1259 OID 19665)
-- Name: messages_sender_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_sender_id_idx ON public.messages USING btree (sender_id);


--
-- TOC entry 4569 (class 1259 OID 19669)
-- Name: messages_thread_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_thread_id_idx ON public.messages USING btree (thread_id);


--
-- TOC entry 4608 (class 1259 OID 19692)
-- Name: migration_state_migration_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX migration_state_migration_name_key ON public.migration_state USING btree (migration_name);


--
-- TOC entry 4517 (class 1259 OID 19637)
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);


--
-- TOC entry 4520 (class 1259 OID 19636)
-- Name: notifications_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_read_idx ON public.notifications USING btree (read);


--
-- TOC entry 4521 (class 1259 OID 19635)
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);


--
-- TOC entry 4522 (class 1259 OID 19634)
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


--
-- TOC entry 4472 (class 1259 OID 19611)
-- Name: payment_methods_seeker_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_methods_seeker_id_idx ON public.payment_methods USING btree (seeker_id);


--
-- TOC entry 4537 (class 1259 OID 19647)
-- Name: pending_job_posts_clerk_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_job_posts_clerk_user_id_idx ON public.pending_job_posts USING btree (clerk_user_id);


--
-- TOC entry 4538 (class 1259 OID 19648)
-- Name: pending_job_posts_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_job_posts_email_idx ON public.pending_job_posts USING btree (email);


--
-- TOC entry 4539 (class 1259 OID 19649)
-- Name: pending_job_posts_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_job_posts_expires_at_idx ON public.pending_job_posts USING btree (expires_at);


--
-- TOC entry 4542 (class 1259 OID 19650)
-- Name: pending_job_posts_session_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_job_posts_session_token_idx ON public.pending_job_posts USING btree (session_token);


--
-- TOC entry 4543 (class 1259 OID 19652)
-- Name: pending_job_posts_stack_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_job_posts_stack_user_id_idx ON public.pending_job_posts USING btree (stack_user_id);


--
-- TOC entry 4524 (class 1259 OID 19638)
-- Name: pending_signups_clerk_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_signups_clerk_user_id_idx ON public.pending_signups USING btree (clerk_user_id);


--
-- TOC entry 4525 (class 1259 OID 19639)
-- Name: pending_signups_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_signups_email_idx ON public.pending_signups USING btree (email);


--
-- TOC entry 4526 (class 1259 OID 19640)
-- Name: pending_signups_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_signups_expires_at_idx ON public.pending_signups USING btree (expires_at);


--
-- TOC entry 4529 (class 1259 OID 19641)
-- Name: pending_signups_session_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_signups_session_token_idx ON public.pending_signups USING btree (session_token);


--
-- TOC entry 4530 (class 1259 OID 19643)
-- Name: pending_signups_stack_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_signups_stack_user_id_idx ON public.pending_signups USING btree (stack_user_id);


--
-- TOC entry 4558 (class 1259 OID 19663)
-- Name: resumes_is_primary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resumes_is_primary_idx ON public.resumes USING btree (is_primary);


--
-- TOC entry 4561 (class 1259 OID 19662)
-- Name: resumes_seeker_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resumes_seeker_id_idx ON public.resumes USING btree (seeker_id);


--
-- TOC entry 4500 (class 1259 OID 19625)
-- Name: saved_jobs_seeker_id_job_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX saved_jobs_seeker_id_job_id_key ON public.saved_jobs USING btree (seeker_id, job_id);


--
-- TOC entry 4493 (class 1259 OID 19622)
-- Name: seeker_concierge_chat_messages_chat_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seeker_concierge_chat_messages_chat_id_idx ON public.seeker_concierge_chat_messages USING btree (chat_id);


--
-- TOC entry 4494 (class 1259 OID 19624)
-- Name: seeker_concierge_chat_messages_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seeker_concierge_chat_messages_created_at_idx ON public.seeker_concierge_chat_messages USING btree (created_at);


--
-- TOC entry 4497 (class 1259 OID 19623)
-- Name: seeker_concierge_chat_messages_sender_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seeker_concierge_chat_messages_sender_id_idx ON public.seeker_concierge_chat_messages USING btree (sender_id);


--
-- TOC entry 4488 (class 1259 OID 19621)
-- Name: seeker_concierge_chats_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seeker_concierge_chats_admin_id_idx ON public.seeker_concierge_chats USING btree (admin_id);


--
-- TOC entry 4489 (class 1259 OID 19619)
-- Name: seeker_concierge_chats_job_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seeker_concierge_chats_job_id_idx ON public.seeker_concierge_chats USING btree (job_id);


--
-- TOC entry 4492 (class 1259 OID 19620)
-- Name: seeker_concierge_chats_seeker_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seeker_concierge_chats_seeker_id_idx ON public.seeker_concierge_chats USING btree (seeker_id);


--
-- TOC entry 4512 (class 1259 OID 19633)
-- Name: team_invitations_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_invitations_email_idx ON public.team_invitations USING btree (email);


--
-- TOC entry 4513 (class 1259 OID 19632)
-- Name: team_invitations_employer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_invitations_employer_id_idx ON public.team_invitations USING btree (employer_id);


--
-- TOC entry 4514 (class 1259 OID 19631)
-- Name: team_invitations_invitation_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_invitations_invitation_token_key ON public.team_invitations USING btree (invitation_token);


--
-- TOC entry 4503 (class 1259 OID 19628)
-- Name: team_members_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_email_idx ON public.team_members USING btree (email);


--
-- TOC entry 4504 (class 1259 OID 19626)
-- Name: team_members_employer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_employer_id_idx ON public.team_members USING btree (employer_id);


--
-- TOC entry 4507 (class 1259 OID 19627)
-- Name: team_members_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_user_id_idx ON public.team_members USING btree (user_id);


--
-- TOC entry 4416 (class 1259 OID 19584)
-- Name: user_profiles_clerk_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_profiles_clerk_user_id_idx ON public.user_profiles USING btree (clerk_user_id);


--
-- TOC entry 4417 (class 1259 OID 19581)
-- Name: user_profiles_clerk_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_clerk_user_id_key ON public.user_profiles USING btree (clerk_user_id);


--
-- TOC entry 4418 (class 1259 OID 19582)
-- Name: user_profiles_legacy_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_legacy_id_key ON public.user_profiles USING btree (legacy_id);


--
-- TOC entry 4421 (class 1259 OID 19580)
-- Name: user_profiles_stack_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_stack_user_id_key ON public.user_profiles USING btree (stack_user_id);


--
-- TOC entry 4382 (class 1259 OID 17529)
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- TOC entry 4412 (class 1259 OID 17530)
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4385 (class 1259 OID 17533)
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- TOC entry 4390 (class 1259 OID 17291)
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- TOC entry 4393 (class 1259 OID 17308)
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- TOC entry 4406 (class 1259 OID 17449)
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- TOC entry 4399 (class 1259 OID 17375)
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- TOC entry 4394 (class 1259 OID 17340)
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- TOC entry 4395 (class 1259 OID 17456)
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- TOC entry 4396 (class 1259 OID 17309)
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- TOC entry 4409 (class 1259 OID 17440)
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- TOC entry 4753 (class 2620 OID 17196)
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- TOC entry 4754 (class 2620 OID 17394)
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- TOC entry 4755 (class 2620 OID 17458)
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- TOC entry 4756 (class 2620 OID 17459)
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- TOC entry 4757 (class 2620 OID 17328)
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- TOC entry 4654 (class 2606 OID 16688)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4659 (class 2606 OID 16777)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4658 (class 2606 OID 16765)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4657 (class 2606 OID 16752)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4665 (class 2606 OID 17017)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4666 (class 2606 OID 17022)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4667 (class 2606 OID 17046)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4668 (class 2606 OID 17041)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4664 (class 2606 OID 16943)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4653 (class 2606 OID 16721)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4661 (class 2606 OID 16824)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4662 (class 2606 OID 16897)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4663 (class 2606 OID 16838)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4655 (class 2606 OID 17060)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4656 (class 2606 OID 16716)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4660 (class 2606 OID 16805)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4670 (class 2606 OID 17153)
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4669 (class 2606 OID 17136)
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4751 (class 2606 OID 20093)
-- Name: _PackageJobs _PackageJobs_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PackageJobs"
    ADD CONSTRAINT "_PackageJobs_A_fkey" FOREIGN KEY ("A") REFERENCES public.employer_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4752 (class 2606 OID 20098)
-- Name: _PackageJobs _PackageJobs_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PackageJobs"
    ADD CONSTRAINT "_PackageJobs_B_fkey" FOREIGN KEY ("B") REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4750 (class 2606 OID 20088)
-- Name: action_logs action_logs_execution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.execution_logs(id) ON DELETE SET NULL;


--
-- TOC entry 4695 (class 2606 OID 19813)
-- Name: admin_actions_log admin_actions_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions_log
    ADD CONSTRAINT admin_actions_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4746 (class 2606 OID 20068)
-- Name: app_fields app_fields_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_fields
    ADD CONSTRAINT app_fields_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.field_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4681 (class 2606 OID 19743)
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4682 (class 2606 OID 19748)
-- Name: applications applications_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4702 (class 2606 OID 19848)
-- Name: concierge_chat_messages concierge_chat_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chat_messages
    ADD CONSTRAINT concierge_chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.concierge_chats(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4703 (class 2606 OID 19853)
-- Name: concierge_chat_messages concierge_chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chat_messages
    ADD CONSTRAINT concierge_chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4699 (class 2606 OID 19833)
-- Name: concierge_chats concierge_chats_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chats
    ADD CONSTRAINT concierge_chats_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4700 (class 2606 OID 19838)
-- Name: concierge_chats concierge_chats_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chats
    ADD CONSTRAINT concierge_chats_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4701 (class 2606 OID 19843)
-- Name: concierge_chats concierge_chats_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_chats
    ADD CONSTRAINT concierge_chats_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4696 (class 2606 OID 19818)
-- Name: concierge_requests concierge_requests_assigned_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_requests
    ADD CONSTRAINT concierge_requests_assigned_admin_id_fkey FOREIGN KEY (assigned_admin_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4697 (class 2606 OID 19823)
-- Name: concierge_requests concierge_requests_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_requests
    ADD CONSTRAINT concierge_requests_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4698 (class 2606 OID 19828)
-- Name: concierge_requests concierge_requests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concierge_requests
    ADD CONSTRAINT concierge_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4711 (class 2606 OID 19893)
-- Name: cover_letter_templates cover_letter_templates_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_templates
    ADD CONSTRAINT cover_letter_templates_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4745 (class 2606 OID 20063)
-- Name: crm_sync_settings crm_sync_settings_last_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_sync_settings
    ADD CONSTRAINT crm_sync_settings_last_saved_by_fkey FOREIGN KEY (last_saved_by) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4723 (class 2606 OID 19953)
-- Name: email_blast_requests email_blast_requests_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_blast_requests
    ADD CONSTRAINT email_blast_requests_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4724 (class 2606 OID 19958)
-- Name: email_blast_requests email_blast_requests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_blast_requests
    ADD CONSTRAINT email_blast_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4725 (class 2606 OID 19963)
-- Name: email_blast_requests email_blast_requests_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_blast_requests
    ADD CONSTRAINT email_blast_requests_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.employer_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4679 (class 2606 OID 19733)
-- Name: employer_packages employer_packages_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employer_packages
    ADD CONSTRAINT employer_packages_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4677 (class 2606 OID 19723)
-- Name: employers employers_current_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_current_package_id_fkey FOREIGN KEY (current_package_id) REFERENCES public.employer_packages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4678 (class 2606 OID 19728)
-- Name: employers employers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4719 (class 2606 OID 19933)
-- Name: external_payments external_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_payments
    ADD CONSTRAINT external_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4720 (class 2606 OID 19938)
-- Name: featured_job_requests featured_job_requests_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_job_requests
    ADD CONSTRAINT featured_job_requests_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4721 (class 2606 OID 19943)
-- Name: featured_job_requests featured_job_requests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_job_requests
    ADD CONSTRAINT featured_job_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4722 (class 2606 OID 19948)
-- Name: featured_job_requests featured_job_requests_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_job_requests
    ADD CONSTRAINT featured_job_requests_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.employer_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4747 (class 2606 OID 20073)
-- Name: field_mappings field_mappings_app_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_mappings
    ADD CONSTRAINT field_mappings_app_field_id_fkey FOREIGN KEY (app_field_id) REFERENCES public.app_fields(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4748 (class 2606 OID 20078)
-- Name: field_mappings field_mappings_ghl_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_mappings
    ADD CONSTRAINT field_mappings_ghl_field_id_fkey FOREIGN KEY (ghl_field_id) REFERENCES public.ghl_fields(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4749 (class 2606 OID 20083)
-- Name: field_mappings field_mappings_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_mappings
    ADD CONSTRAINT field_mappings_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.field_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4683 (class 2606 OID 19753)
-- Name: applications fk_applications_resume_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT fk_applications_resume_id FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL;


--
-- TOC entry 4735 (class 2606 OID 20013)
-- Name: additional_service_purchases fk_assigned_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_assigned_admin FOREIGN KEY (assigned_admin_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4687 (class 2606 OID 19773)
-- Name: cancellation_surveys fk_cancellation_survey_seeker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_surveys
    ADD CONSTRAINT fk_cancellation_survey_seeker FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON DELETE CASCADE;


--
-- TOC entry 4688 (class 2606 OID 19778)
-- Name: cancellation_surveys fk_cancellation_survey_subscription; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_surveys
    ADD CONSTRAINT fk_cancellation_survey_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- TOC entry 4742 (class 2606 OID 20048)
-- Name: service_request_audits fk_changed_by_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_request_audits
    ADD CONSTRAINT fk_changed_by_user FOREIGN KEY (changed_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4736 (class 2606 OID 20018)
-- Name: additional_service_purchases fk_employer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_employer FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON DELETE CASCADE;


--
-- TOC entry 4737 (class 2606 OID 20023)
-- Name: additional_service_purchases fk_employer_package; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_employer_package FOREIGN KEY (employer_package_id) REFERENCES public.employer_packages(id) ON DELETE CASCADE;


--
-- TOC entry 4738 (class 2606 OID 20028)
-- Name: additional_service_purchases fk_payment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES public.external_payments(id) ON DELETE SET NULL;


--
-- TOC entry 4691 (class 2606 OID 19793)
-- Name: resume_critiques fk_resume_critique_seeker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_critiques
    ADD CONSTRAINT fk_resume_critique_seeker FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON DELETE CASCADE;


--
-- TOC entry 4739 (class 2606 OID 20033)
-- Name: additional_service_purchases fk_seeker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_seeker FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON DELETE CASCADE;


--
-- TOC entry 4740 (class 2606 OID 20038)
-- Name: additional_service_purchases fk_service; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_service FOREIGN KEY (service_id) REFERENCES public.additional_services(service_id) ON DELETE CASCADE;


--
-- TOC entry 4743 (class 2606 OID 20053)
-- Name: service_request_audits fk_service_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_request_audits
    ADD CONSTRAINT fk_service_request FOREIGN KEY (service_request_id) REFERENCES public.additional_service_purchases(id) ON DELETE CASCADE;


--
-- TOC entry 4741 (class 2606 OID 20043)
-- Name: additional_service_purchases fk_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_service_purchases
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4715 (class 2606 OID 19913)
-- Name: user_invitations fk_user_invitation_inviter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT fk_user_invitation_inviter FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4684 (class 2606 OID 19758)
-- Name: interview_history interview_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_history
    ADD CONSTRAINT interview_history_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- TOC entry 4692 (class 2606 OID 19798)
-- Name: invoices invoices_employer_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_employer_package_id_fkey FOREIGN KEY (employer_package_id) REFERENCES public.employer_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4676 (class 2606 OID 19718)
-- Name: job_seekers job_seekers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_seekers
    ADD CONSTRAINT job_seekers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4680 (class 2606 OID 19738)
-- Name: jobs jobs_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4732 (class 2606 OID 19998)
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4734 (class 2606 OID 20008)
-- Name: message_drafts message_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_drafts
    ADD CONSTRAINT message_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4733 (class 2606 OID 20003)
-- Name: message_templates message_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4727 (class 2606 OID 19973)
-- Name: messages messages_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4728 (class 2606 OID 19978)
-- Name: messages messages_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4729 (class 2606 OID 19983)
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4730 (class 2606 OID 19988)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4731 (class 2606 OID 19993)
-- Name: messages messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4718 (class 2606 OID 19928)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4693 (class 2606 OID 19803)
-- Name: payment_methods payment_methods_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4694 (class 2606 OID 19808)
-- Name: payment_methods payment_methods_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4744 (class 2606 OID 20058)
-- Name: purchased_add_ons purchased_add_ons_employerPackageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchased_add_ons
    ADD CONSTRAINT "purchased_add_ons_employerPackageId_fkey" FOREIGN KEY ("employerPackageId") REFERENCES public.employer_packages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4726 (class 2606 OID 19968)
-- Name: resumes resumes_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4709 (class 2606 OID 19883)
-- Name: saved_jobs saved_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4710 (class 2606 OID 19888)
-- Name: saved_jobs saved_jobs_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4707 (class 2606 OID 19873)
-- Name: seeker_concierge_chat_messages seeker_concierge_chat_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chat_messages
    ADD CONSTRAINT seeker_concierge_chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.seeker_concierge_chats(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4708 (class 2606 OID 19878)
-- Name: seeker_concierge_chat_messages seeker_concierge_chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chat_messages
    ADD CONSTRAINT seeker_concierge_chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4704 (class 2606 OID 19858)
-- Name: seeker_concierge_chats seeker_concierge_chats_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chats
    ADD CONSTRAINT seeker_concierge_chats_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4705 (class 2606 OID 19863)
-- Name: seeker_concierge_chats seeker_concierge_chats_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chats
    ADD CONSTRAINT seeker_concierge_chats_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4706 (class 2606 OID 19868)
-- Name: seeker_concierge_chats seeker_concierge_chats_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seeker_concierge_chats
    ADD CONSTRAINT seeker_concierge_chats_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4689 (class 2606 OID 19783)
-- Name: subscription_cancellation_logs subscription_cancellation_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_cancellation_logs
    ADD CONSTRAINT subscription_cancellation_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4690 (class 2606 OID 19788)
-- Name: subscription_cancellation_logs subscription_cancellation_logs_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_cancellation_logs
    ADD CONSTRAINT subscription_cancellation_logs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4685 (class 2606 OID 19763)
-- Name: subscriptions subscriptions_external_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_external_payment_id_fkey FOREIGN KEY (external_payment_id) REFERENCES public.external_payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4686 (class 2606 OID 19768)
-- Name: subscriptions subscriptions_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.job_seekers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4716 (class 2606 OID 19918)
-- Name: team_invitations team_invitations_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4717 (class 2606 OID 19923)
-- Name: team_invitations team_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4712 (class 2606 OID 19898)
-- Name: team_members team_members_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4713 (class 2606 OID 19903)
-- Name: team_members team_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4714 (class 2606 OID 19908)
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4671 (class 2606 OID 17303)
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4672 (class 2606 OID 17350)
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4673 (class 2606 OID 17370)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4674 (class 2606 OID 17365)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- TOC entry 4675 (class 2606 OID 17435)
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- TOC entry 4909 (class 0 OID 16529)
-- Dependencies: 320
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4920 (class 0 OID 16883)
-- Dependencies: 334
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4911 (class 0 OID 16681)
-- Dependencies: 325
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4908 (class 0 OID 16522)
-- Dependencies: 319
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4915 (class 0 OID 16770)
-- Dependencies: 329
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4914 (class 0 OID 16758)
-- Dependencies: 328
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4913 (class 0 OID 16745)
-- Dependencies: 327
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4921 (class 0 OID 16933)
-- Dependencies: 335
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4907 (class 0 OID 16511)
-- Dependencies: 318
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4918 (class 0 OID 16812)
-- Dependencies: 332
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4919 (class 0 OID 16830)
-- Dependencies: 333
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4910 (class 0 OID 16537)
-- Dependencies: 321
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4912 (class 0 OID 16711)
-- Dependencies: 326
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4917 (class 0 OID 16797)
-- Dependencies: 331
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4916 (class 0 OID 16788)
-- Dependencies: 330
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4906 (class 0 OID 16499)
-- Dependencies: 316
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4930 (class 0 OID 17514)
-- Dependencies: 357
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4923 (class 0 OID 17282)
-- Dependencies: 350
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4927 (class 0 OID 17402)
-- Dependencies: 354
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4928 (class 0 OID 17415)
-- Dependencies: 355
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4922 (class 0 OID 17274)
-- Dependencies: 349
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4924 (class 0 OID 17292)
-- Dependencies: 351
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4925 (class 0 OID 17341)
-- Dependencies: 352
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4926 (class 0 OID 17355)
-- Dependencies: 353
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4929 (class 0 OID 17425)
-- Dependencies: 356
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4931 (class 6104 OID 16430)
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- TOC entry 3942 (class 3466 OID 16575)
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- TOC entry 3947 (class 3466 OID 16654)
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- TOC entry 3941 (class 3466 OID 16573)
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- TOC entry 3948 (class 3466 OID 16657)
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- TOC entry 3943 (class 3466 OID 16576)
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- TOC entry 3944 (class 3466 OID 16577)
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


-- Completed on 2026-04-18 12:21:48 PST

--
-- PostgreSQL database dump complete
--

\unrestrict hJqZaRiOoRfigUAyDpRfK4sYkzvGJPwWNpIL7SzTPOS90huk2W85I7Hf9xagiMc

