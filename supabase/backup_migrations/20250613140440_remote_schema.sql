set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_or_create_onboarding_conversation(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  conversation_id uuid;
  onboarding_record record;
BEGIN
  -- Get existing onboarding record
  SELECT * INTO onboarding_record
  FROM onboarding
  WHERE user_id = p_user_id;
  
  -- If onboarding exists and has conversation, return it
  IF onboarding_record.conversation_id IS NOT NULL THEN
    RETURN onboarding_record.conversation_id;
  END IF;
  
  -- If onboarding exists but no conversation, create one
  IF onboarding_record.id IS NOT NULL THEN
    INSERT INTO conversations (user_id, title, type)
    VALUES (p_user_id, 'Onboarding Setup', 'onboarding')
    RETURNING id INTO conversation_id;
    
    UPDATE onboarding 
    SET conversation_id = conversation_id
    WHERE user_id = p_user_id;
    
    -- Add initial message if conversation is new
    INSERT INTO messages (conversation_id, sender, role, content)
    VALUES (
      conversation_id,
      'assistant',
      'assistant',
      '👋 Hi! I''m your Cutcall setup assistant. I''m here to help you get your AI phone assistant ready for your business. Let''s start with something simple - what''s your name?'
    );
    
    RETURN conversation_id;
  END IF;
  
  -- If no onboarding record exists, create everything
  INSERT INTO conversations (user_id, title, type)
  VALUES (p_user_id, 'Onboarding Setup', 'onboarding')
  RETURNING id INTO conversation_id;
  
  INSERT INTO onboarding (user_id, conversation_id)
  VALUES (p_user_id, conversation_id);
  
  -- Add initial assistant message
  INSERT INTO messages (conversation_id, sender, role, content)
  VALUES (
    conversation_id,
    'assistant',
    'assistant',
    '👋 Hi! I''m your Cutcall setup assistant. I''m here to help you get your AI phone assistant ready for your business. Let''s start with something simple - what''s your name?'
  );
  
  RETURN conversation_id;
END;
$function$
;


