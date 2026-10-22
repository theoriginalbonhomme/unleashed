-- Supabase SQL Editor does not support psql \set. Replace the marked email literal below
-- with the address already listed under Authentication → Users.
do $seed$
declare
  v_user_id uuid;
begin
  with seed_input as (
    select lower(trim('YOUR_EMAIL_HERE'))::text as email
  )
  select users.id
  into v_user_id
  from seed_input
  join auth.users as users on lower(users.email) = seed_input.email
  limit 1;

  if v_user_id is null then
    raise exception 'No Supabase Auth user found for the supplied email. Create the user under Authentication → Users, then update the email literal and run this script again.';
  end if;

  insert into public.profiles (
    id,
    slug,
    name,
    roles,
    location,
    bio,
    offers,
    looking_for,
    creates,
    links,
    photo_path,
    status,
    invited_by
  ) values (
    v_user_id,
    'bonhomme',
    'BONHOMME',
    array['Producer', 'DJ', 'Music & sound art']::text[],
    'Travelling the world for more than 30 years',
    $bio$In the Cathar lands of southern France, people called the members of a brotherhood of absolute goodness bonshommes: good men. BONHOMME carries that name into dance music culture: music made by loving humans, in service of art.

Genre doesn't matter. What matters is that the music is good and the sound is perfect.

On the road since I was seven, at judo competitions in Finland. Fighting sports took me across Europe, Russia and Georgia, until I became Estonia's first MMA champion in 2015. Music took me inside the underground: Berlin, San Francisco, LA and Tallinn, ecstatic dance communities and high-level festivals.

At festivals I have been assistant to the deco team leader, a light and sound technician, and above all a dancer who holds the room from the floor, in unity, kindness and safety. Pure love for the right people and the music. I always watch for the artist who needs help, and I will do anything in my power to help them deliver the art.$bio$,
    $offers$- Make a good track sound perfect: mix, master, fix the sound.
- Make crazy decisions to make art happen. Usually long hours, sometimes a missed flight. Always worth it.
- Produce: from a rough idea or a voice memo to a finished track.
- DJ: read the room and carry the night, from warm-up to peak time, and most importantly the afters.
- Hold the room from the dance floor: unity, kindness and safety.
- Crew: deco, lights and sound. Whatever the artist needs to deliver the art.
- Coach 1:1, in fighting or any field, for people whose intention is to become the best. I choose my students carefully.
- Fight: Estonia's first MMA champion (2015, 77.1 kg), judo 2nd dan, BJJ blue belt. Wherever I travel, I visit a gym and spar. Three Gracie BJJ academies so far, and my best boxing coach was in India.
- Sail: licensed skipper with 10+ years of blue water, for hire. SAR (search and rescue) team leader, so I watch out for everyone on board.
- Make art and music anywhere, often together with the people we want to make it with. More than 30 years on the road, in Estonian and English.
- Explore, in every possible way: new sounds, new places, new people, new ways of making art.$offers$,
    $looking$- People who breathe music, who are driven by it, whatever they play or make.
- An unleash together brings the energy to face the rest of life.
- Got a good track, but the sound is shit? That ends here. Send it.
- Rooms, parties, raves and boats to play.$looking$,
    $creates$I'm an artist because my mission is to recognise and support art, mine and everyone's.
Goals:
- A collab in every place I go.
- All my music free for DJs worldwide.
- Scene raves, parties and youth rap battles in Tallinn.
- A network of artists who help each other and all get paid when the art earns.$creates$,
    array[
      'https://www.mixcloud.com/theoriginalbonhomme/',
      'https://soundcloud.com/rickyvonmond',
      'https://www.youtube.com/@theoriginalbonhomme',
      'https://www.youtube.com/@rickyvonmond'
    ]::text[],
    'img/bonhomme-portrait.svg',
    'live',
    null
  )
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    roles = excluded.roles,
    location = excluded.location,
    bio = excluded.bio,
    offers = excluded.offers,
    looking_for = excluded.looking_for,
    creates = excluded.creates,
    links = excluded.links,
    photo_path = excluded.photo_path,
    status = excluded.status,
    invited_by = excluded.invited_by;

  insert into public.roles_admin (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
end;
$seed$;
