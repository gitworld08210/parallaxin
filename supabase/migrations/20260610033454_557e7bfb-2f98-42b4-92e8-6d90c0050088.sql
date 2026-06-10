
ALTER TABLE public.tips ADD CONSTRAINT tips_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.tips ADD CONSTRAINT tips_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.kyc_submissions ADD CONSTRAINT kyc_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
