PRAGMA foreign_keys = ON;

ALTER TABLE obligations ADD COLUMN plannedChargeDay INTEGER;
ALTER TABLE obligations ADD COLUMN plannedChargeMonth INTEGER;

UPDATE contacts
SET dossierTopic = CASE dossierTopic
  WHEN 'NONE' THEN ''
  WHEN 'VERZEKERINGEN' THEN 'Verzekeringen'
  WHEN 'WONEN' THEN 'Wonen'
  WHEN 'ZORG' THEN 'Zorg'
  WHEN 'ENERGIE' THEN 'Energie'
  WHEN 'OVERIG' THEN 'Overig'
  ELSE COALESCE(dossierTopic, '')
END;

UPDATE documents
SET dossierTopic = CASE dossierTopic
  WHEN 'NONE' THEN ''
  WHEN 'VERZEKERINGEN' THEN 'Verzekeringen'
  WHEN 'WONEN' THEN 'Wonen'
  WHEN 'ZORG' THEN 'Zorg'
  WHEN 'ENERGIE' THEN 'Energie'
  WHEN 'OVERIG' THEN 'Overig'
  ELSE COALESCE(dossierTopic, '')
END;

UPDATE obligations
SET dossierTopic = CASE dossierTopic
  WHEN 'NONE' THEN ''
  WHEN 'VERZEKERINGEN' THEN 'Verzekeringen'
  WHEN 'WONEN' THEN 'Wonen'
  WHEN 'ZORG' THEN 'Zorg'
  WHEN 'ENERGIE' THEN 'Energie'
  WHEN 'OVERIG' THEN 'Overig'
  ELSE COALESCE(dossierTopic, '')
END;

UPDATE import_documents
SET draftDossierTopic = CASE draftDossierTopic
  WHEN 'NONE' THEN ''
  WHEN 'VERZEKERINGEN' THEN 'Verzekeringen'
  WHEN 'WONEN' THEN 'Wonen'
  WHEN 'ZORG' THEN 'Zorg'
  WHEN 'ENERGIE' THEN 'Energie'
  WHEN 'OVERIG' THEN 'Overig'
  ELSE COALESCE(draftDossierTopic, '')
END;

INSERT INTO app_settings(key, value)
SELECT 'options.dossiers', '["Verzekeringen","Wonen","Zorg","Energie","Overig"]'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'options.dossiers');

INSERT INTO app_settings(key, value)
SELECT 'options.paymentMethods', '["Incasso","Contant","Creditcard","Paypal"]'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'options.paymentMethods');
