# Modules ajoutés

## DMS (pré-signé)
- Endpoint `/storage/presign` (mock) pour obtenir une URL de dépôt.
- À remplacer par S3/GCS (presigner) + antivirus + contrôle MIME.

## Workflows paramétrables
- Modèles `Workflow/WfState/WfTransition/WfGuard`
- Endpoints de création + application d'une transition sur `Application`
- Guards prêt-à-l'emploi : `scoreGTE`, `docsComplete` (à étendre)

## Entretiens
- `InterviewSlot` + `InterviewBooking`
- Création de créneaux, liste, réservation

## Paiements & Echéanciers
- `PaymentPlan` + `PaymentSchedule`
- Webhook Stripe stub `/psp/stripe/webhook`

## YPAREO
- Stubs existants + points d'extension pour groupes/sections/pièces
