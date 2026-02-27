import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test profiles with rich content designed to create meaningful circles
const testProfiles = [
  {
    email: 'margaret.chen@test.com',
    firstName: 'Margaret',
    lastName: 'Chen',
    profileSummary: `Margaret Chen is a retired pediatrician who's discovered a second passion in life: birding. After forty years of caring for children, she now spends her mornings with binoculars and a field guide, cataloging the species that visit her backyard feeders. "There's something magical about the patience required," she says. "You wait, and wait, and suddenly a painted bunting appears." Beyond birds, Margaret tends an impressive native plant garden specifically designed to attract pollinators. She's a grandmother of four and finds that her grandchildren share her enthusiasm for nature walks. Margaret is eager to share her knowledge of local bird species and hopes to organize community bird walks.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I spent forty years as a pediatrician, and now I've completely reinvented myself. Birding has become my obsession - I can identify over 200 species by their calls alone. I wake up at 5am just to catch the dawn chorus. My husband jokes that I've traded crying babies for singing birds, and honestly, he's not wrong." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "My mornings are for birding - I have a route through three different parks that I do religiously. Then afternoons are for my native plant garden. I'm trying to create a certified wildlife habitat in my backyard. I've got coneflowers, milkweed, and native grasses. The monarchs are finally coming back!" },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "I'm a grandmother of four wonderful kids ranging from 3 to 12 years old. The oldest one, Emma, has caught the birding bug from me. We have matching binoculars and she keeps her own life list. Nothing makes me happier than sharing this passion with her." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I'd love to lead bird walks for anyone interested. I have extra binoculars and field guides I can lend out. Also happy to consult on native plant gardens - I've made every mistake in the book so you don't have to!" }
    ]
  },
  {
    email: 'robert.williams@test.com',
    firstName: 'Robert',
    lastName: 'Williams',
    profileSummary: `Robert Williams is a former high school shop teacher who never lost his love for working with his hands. His garage workshop is equipped with everything from a lathe to a CNC router, and he's always got a project in progress. Currently, he's building custom birdhouses modeled after local architecture. "Every bird deserves a beautiful home," he laughs. Robert also enjoys hiking local trails and has completed every trail in the county at least once. He's a widower of three years and finds community connection increasingly important. He's hoping to find others who appreciate both craftsmanship and the outdoors.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I taught shop class for 35 years, and I still think everyone should know how to use their hands. My workshop is my sanctuary - I've got every tool imaginable. Right now I'm on a birdhouse kick, making these elaborate Victorian-style houses. The birds don't care about the gingerbread trim, but I do!" },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "I hike. A lot. I've done every trail in the county, some of them dozens of times. There's always something new to notice. And when I'm not hiking, I'm in the workshop. Currently teaching myself some basic CNC work - you're never too old to learn new skills." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Lost my wife Carol three years ago. We were married 47 years. My kids are scattered across the country now, but we video chat every Sunday. I've got two grandkids in Oregon I don't see often enough. That's part of why community matters more to me now." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I'm happy to teach basic woodworking to anyone interested. Also have lots of hiking trail recommendations - I know where the best views are, where to avoid on weekends, which trails are good for beginners. Would love hiking companions!" }
    ]
  },
  {
    email: 'susan.martinez@test.com',
    firstName: 'Susan',
    lastName: 'Martinez',
    profileSummary: `Susan Martinez spent thirty years as a librarian and still believes books can change lives. She runs an informal neighborhood book club that meets on her patio monthly, where discussions range from contemporary fiction to classic mysteries. Beyond reading, Susan has developed an unexpected passion for baking - specifically, elaborate decorated cookies. Her sugar cookies have won three county fair ribbons, and she's known for bringing seasonal treats to every neighborhood gathering. Susan is also navigating life as a first-time grandmother, having just welcomed twin granddaughters last month.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I'm a librarian through and through, even in retirement. Books are my thing - I read about a hundred a year, everything from literary fiction to cozy mysteries. I run a little book club that meets on my patio. We've been going for six years now, about eight regulars." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Reading, obviously. But also baking - specifically decorated sugar cookies. I've gotten really into it. Royal icing, food-safe markers, the whole nine yards. I've won three ribbons at the county fair. My neighbors know to expect Halloween cookies, Christmas cookies, Valentine's cookies..." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Big news in my life - I just became a grandmother! My daughter had twin girls six weeks ago. I'm still getting used to it. I've been knitting tiny sweaters like mad. It's funny how your whole world shifts when those babies arrive." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "The book club is always open to new members. We read a pretty wide variety - last month was Lessons in Chemistry, this month is an Agatha Christie. Also happy to share cookie decorating techniques with anyone interested!" }
    ]
  },
  {
    email: 'james.oconnor@test.com',
    firstName: 'James',
    lastName: "O'Connor",
    profileSummary: `James O'Connor is a retired IT director who hasn't stopped helping people with technology. He volunteers weekly at the senior center teaching iPad basics and troubleshooting devices. "Everyone deserves to video chat with their grandkids," he says simply. When not debugging someone's email, James tends an impressive vegetable garden using intensive raised bed methods. He's passionate about food security and has taught classes on small-space gardening. James is also an avid birder who participates in the annual Christmas Bird Count and has recently gotten interested in nature photography.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I spent my career in IT management, but what I really love is teaching. Now I volunteer at the senior center helping folks with their iPads and phones. Nothing beats the moment when someone finally masters FaceTime and can see their grandkids. That's the real reward." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Gardening has become a serious hobby. I use raised bed intensive methods - getting maximum yield from minimum space. Tomatoes, peppers, greens. I've taught workshops on it. Also getting into birding and bird photography lately. Got a nice telephoto lens for my birthday." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Married to my wife Patricia for 38 years. We have three adult children and four grandchildren, all within driving distance thankfully. Sunday dinners are a big deal in our house - everyone comes over and I cook way too much food." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Free tech help for anyone who needs it. No question is too basic - I've explained email about a thousand times and I'm happy to do it again. Also love talking gardening, especially vegetable gardening in small spaces." }
    ]
  },
  {
    email: 'patricia.oconnor@test.com',
    firstName: 'Patricia',
    lastName: "O'Connor",
    profileSummary: `Patricia O'Connor taught elementary school for 32 years and maintains that children are her favorite people. Now retired, she channels that nurturing energy into several pursuits: her award-winning rose garden, a serious book club habit, and regular volunteer work with a children's literacy program. Patricia is known for her legendary baked goods, particularly her sourdough bread started from a culture she's maintained for fifteen years. She and her husband James are recent empty nesters navigating how to fill their suddenly quiet house - though their four grandchildren help with that.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Teaching shaped who I am. Thirty-two years of first graders teaches you patience, creativity, and how to find joy in small victories. Now I volunteer with a literacy program - still teaching kids to read, just on my own schedule. It keeps me young." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "My rose garden is my pride and joy - I have about forty bushes, mostly heirloom varieties. Won a few ribbons at shows. I also bake constantly. My sourdough starter is fifteen years old - I've named her Gladys. And I'm in two book clubs, which might be too many but I can't give either up." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "James and I have been married 38 years. We raised three kids and now we're enjoying four grandchildren. The house got very quiet when the last kid moved out, but honestly we've filled it back up with hobbies and hosting and those grandkids visiting." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I'm always happy to share sourdough starter - Gladys has given birth to many children over the years. Also rose care advice for anyone who wants it. And I make a mean loaf of bread if you ever need comfort carbs." }
    ]
  },
  {
    email: 'david.nguyen@test.com',
    firstName: 'David',
    lastName: 'Nguyen',
    profileSummary: `David Nguyen retired from architecture two years ago but still thinks in blueprints and floor plans. He's channeled that spatial intelligence into an unexpected hobby: elaborate woodworking projects, from furniture to intricate puzzle boxes. His workshop is immaculate, his joinery is flawless, and he's currently building a canoe in his garage. David also maintains a serious hiking habit, preferring challenging trails and multi-day backpacking trips. He's recently become a grandfather for the first time and is already planning which trails will be suitable for a toddler.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Architecture trained me to think in three dimensions, and now I apply that to woodworking. I'm building a cedar strip canoe in my garage right now. It's meditative - just me and the wood, solving problems, fitting pieces together. Probably the most satisfying work I've ever done." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Hiking is my other passion. Not just day hikes - I do multi-day backpacking trips, usually in the mountains. Last year I did a section of the Appalachian Trail. The solitude and physical challenge, there's nothing like it. When I'm home, I'm in the workshop." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "My son just made me a grandfather three months ago - little Henry. Already planning future hiking trips with him, though I suppose I need to wait a few years. My wife thinks I'm being optimistic about getting a toddler to appreciate wilderness camping." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Happy to share woodworking knowledge - I've got a well-equipped shop and don't mind company. Also know a lot about trails in the region if anyone needs recommendations or a hiking partner. Safety in numbers on the trail!" }
    ]
  },
  {
    email: 'carol.thompson@test.com',
    firstName: 'Carol',
    lastName: 'Thompson',
    profileSummary: `Carol Thompson spent her career as a botanical illustrator, and her eye for detail now serves her well in two hobbies: bird watching and native plant gardening. She can identify most birds by their field marks and has filled countless sketchbooks with careful drawings of the species she encounters. Her garden is a certified wildlife habitat featuring only native species, and she's evangelical about converting others. Carol is also navigating her first year as a widow and finding that her nature hobbies provide both solace and community connection.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I was a botanical illustrator for thirty years - scientific illustration for field guides and textbooks. It trained me to really see things, every detail. Now I apply that to birding. I don't just identify birds, I sketch them. I have about twenty filled sketchbooks of bird drawings." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Mornings are for birding. I have my regular spots. Then I come home and work in my native plant garden. It's all about creating habitat - I've got specific plants for specific butterflies, specific birds. The whole yard is basically a food web illustration come to life." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Lost my husband Frank last year. We were married 41 years. It's been an adjustment. My daughter lives nearby and has been wonderful, but the days are long sometimes. The birds help, honestly. They don't care that I'm sad; they just keep showing up." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Would love to connect with other birders. Also happy to consult on native plant gardens - I know which plants attract which species, how to create habitat, all of it. And I still do illustration, if anyone wants a sketch of their garden or favorite bird." }
    ]
  },
  {
    email: 'michael.park@test.com',
    firstName: 'Michael',
    lastName: 'Park',
    profileSummary: `Michael Park was a high school principal for twenty years, and the organizing skills haven't faded. Now he applies them to community building and personal projects. He's the driving force behind the neighborhood's informal tool library, where anyone can borrow anything from ladders to pressure washers. Michael is also an avid hiker and amateur photographer who documents local trails with the goal of creating a comprehensive trail guide. He and his wife recently became empty nesters and are rediscovering what it means to have free time.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Twenty years as a high school principal taught me how to build community. Now I'm doing it on a smaller scale - I organize things, connect people, make things happen. Started a neighborhood tool library that's become surprisingly popular. Why should everyone own a pressure washer?" },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Hiking and photography, usually combined. I'm documenting every trail in the county - photographs, maps, difficulty ratings, best times to visit. Eventually want to publish a comprehensive local trail guide. It gives my hikes purpose beyond just exercise." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Our youngest just left for college, so my wife Karen and I are empty nesters. It's strange after 25 years of kids in the house. We're learning to be just a couple again. Lots of hiking together now that we don't have to coordinate with anyone else's schedule." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "The tool library is always expanding - let me know if there's something you need that we don't have yet. Also happy to share trail knowledge and hiking routes. Looking for photography buddies too - anyone else interested in nature photography?" }
    ]
  },
  {
    email: 'elena.rodriguez@test.com',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    profileSummary: `Elena Rodriguez was a pastry chef for thirty years, and retirement hasn't dulled her passion for creating beautiful, delicious things. Her kitchen produces a steady stream of elaborate cakes, French pastries, and artisan breads, most of which she gives away to neighbors and friends. Elena has also rediscovered her childhood love of birding, combining morning coffee with binocular time on her back deck. She's a grandmother of six who hosts legendary birthday parties featuring her professional-quality cakes.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I was a pastry chef - the real deal, French training, fancy restaurants. Now I bake for love instead of money. Yesterday I made croissants from scratch just because it was Tuesday. My neighbors get the overflow. There's always something proofing or cooling on my counter." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Mornings are for coffee and birds. I've got a deck with feeders and I just sit and watch. Getting better at identification - working my way through a field guide systematically. Then afternoons are for baking. It's a good life, honestly." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Six grandchildren, if you can believe it. I'm the birthday cake grandma - every kid gets whatever cake they want, professionally decorated. Last year it was a dinosaur, a unicorn, and a construction truck. I love the challenge." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Happy to teach baking to anyone interested - especially bread and pastry techniques. Would love to connect with other birders too. And I'm always looking for people to give baked goods to, so if you want to be on my distribution list, let me know!" }
    ]
  },
  {
    email: 'thomas.jackson@test.com',
    firstName: 'Thomas',
    lastName: 'Jackson',
    profileSummary: `Thomas Jackson worked as a civil engineer for forty years, building bridges and roads across the state. Now he builds furniture in his home workshop, applying the same precision and planning to smaller-scale projects. His specialty is mid-century modern reproductions, though he'll tackle any interesting challenge. Thomas is also a dedicated reader, particularly of history and biography, and participates in a men's book club that's been meeting for twelve years. He's recently started learning woodturning at his wife's suggestion that he needed "one more hobby."`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I built bridges for forty years - real infrastructure, things that'll outlast me. Now I build furniture. It's the same satisfaction, scaled down. I love the planning, the precision, seeing something come together. Currently obsessed with mid-century modern design." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Mornings in the workshop, afternoons reading. I'm in a men's book club - we've met monthly for twelve years now. Mostly history and biography. Just finished a Churchill biography. Also learning woodturning, which is a whole different skill set." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Married to Marie for 44 years. Two grown daughters, three grandkids. The grandkids love coming to the workshop. I've started simple projects with them - birdhouses, small boxes. Passing down the skills." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Always happy to talk woodworking. I've got a well-equipped shop and plenty of experience. The book club is open to new members too - we're a welcoming bunch despite being mostly old guys arguing about history." }
    ]
  },
  {
    email: 'nancy.white@test.com',
    firstName: 'Nancy',
    lastName: 'White',
    profileSummary: `Nancy White was a professional photographer specializing in wildlife and nature, and she hasn't put down the camera in retirement. Now she focuses on local subjects: the birds at her feeders, the wildflowers along trails, the play of light through trees. Her photos have been featured in local publications and she teaches occasional workshops on nature photography. Nancy is also an enthusiastic hiker who knows every trail in the county and isn't afraid of early morning starts to catch the best light.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I've been a photographer my whole adult life - wildlife and nature specifically. Published in magazines, worked with conservation organizations. Now I focus on what's right here: backyard birds, local trails, nearby wilderness. The subjects are smaller but the joy is the same." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Photography is both my hobby and my identity. I'm out at dawn most mornings catching the good light. I know all the local trails and where to find the best subjects - which meadows for wildflowers, which ponds for herons, where the owls nest." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Divorced twenty years now, no kids of my own but I've got nieces and nephews scattered around. My camera is my constant companion. I've built a rich life around my work and my outdoor community. Not traditional but it works for me." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I teach nature photography workshops a few times a year. Happy to share what I know - composition, lighting, equipment recommendations. Also always looking for hiking companions who don't mind starting before sunrise!" }
    ]
  },
  {
    email: 'george.miller@test.com',
    firstName: 'George',
    lastName: 'Miller',
    profileSummary: `George Miller spent his career as a science teacher and has never stopped being curious about how things work. His interests range widely: amateur astronomy, weather recording, vegetable gardening using scientific methods, and recently, beekeeping. He maintains a small apiary and has become the neighborhood expert on pollinator-friendly practices. George is also navigating being a first-time grandfather and finding that his teaching instincts are as strong as ever.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Once a science teacher, always a science teacher. I approach everything with curiosity and methodology. My vegetable garden has soil sensors and I track yields in spreadsheets. I've got weather recording equipment that uploads to a national database. And now I'm learning beekeeping - fascinating creatures." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "The bees take a lot of attention, especially in spring and summer. I've got three hives now. Also serious about the vegetable garden - I do raised beds, intensive methods, track everything. And clear nights I'm out with my telescope. Never lost that childhood wonder at the stars." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "My son just had a baby - I'm a grandfather for the first time. Already planning all the science projects we'll do together. My wife says I need to let the kid be a kid first, but I've already bought a junior microscope that's sitting in the closet waiting." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Happy to share beekeeping knowledge - including honey when the harvest is good. Also know a lot about scientific gardening if anyone wants to geek out about soil chemistry and pollinator strategies. And I've got a decent telescope if anyone wants to look at Saturn's rings." }
    ]
  },
  // --- Additional profiles for natural circle size distribution ---
  // These push the counts to: Birding=8, Gardening=7, Hiking=6, Baking=4, Books=3, Woodworking=3
  {
    email: 'barbara.ellis@test.com',
    firstName: 'Barbara',
    lastName: 'Ellis',
    profileSummary: `Barbara Ellis spent her career as a pediatric nurse and brought the same careful attention to detail to her retirement hobbies. She's a dedicated birder who keeps meticulous life lists and volunteers as a bird bander at a local wildlife preserve. Barbara is also a prolific baker who specializes in decorated celebration cakes and has a standing order from half her street for birthdays and holidays. She has three grandchildren who serve as enthusiastic taste-testers.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Nursing trained me to be observant and patient - skills that translate perfectly to birding. I've been keeping a life list for twenty-two years, currently at 340 species. I volunteer as a bird bander at Hawk Ridge every fall. There's nothing like holding a warbler in your hand before releasing it." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Birding takes up my mornings. Baking takes up my afternoons. I do decorated cakes - tiered wedding cakes, birthday cakes, the whole thing. I've done eight wedding cakes this year alone. My friends joke I should open a bakery, but then it would be work and not fun." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Three grandchildren, ages 5, 8, and 11. They all know what a hummingbird feeder is and why we can't talk loudly near it. The middle one, Jake, is my baking helper. He's already better at piping frosting than most adults." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I'd love to connect with other birders - always looking for field trip companions. And if anyone wants baking lessons or a cake for a special occasion, I'm happy to help. I find teaching either skill very satisfying." }
    ]
  },
  {
    email: 'william.chen@test.com',
    firstName: 'William',
    lastName: 'Chen',
    profileSummary: `William Chen retired after a long career as a CPA and immediately threw himself into the two passions he'd never had enough time for: competitive birding and vegetable gardening. He now participates in Christmas Bird Counts and Big Day competitions, approaching both with the same methodical precision he applied to tax returns. His raised bed garden produces more vegetables than he can possibly eat, so he's become a regular at the neighborhood produce swap.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "I'm a reformed workaholic who discovered that retirement is the best thing that ever happened to me. Birding and gardening require the same qualities that made me a good accountant: patience, attention to detail, record-keeping. Except the records are bird sightings and tomato yields instead of spreadsheets." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "I do competitive birding - Christmas Bird Counts, Big Day events, eBird checklists every single time I go out. Currently ranked in the top 10 locally on eBird. The gardening is less competitive but equally serious. Eight raised beds, drip irrigation, the whole setup. I grow more than I can eat." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "My wife thinks the birding competitions are a little excessive but tolerates them lovingly. Two grown kids, one grandchild so far. My daughter has inherited the gardening gene - we swap seeds every spring and compare notes all summer." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "Extra vegetables are always available - I literally cannot grow less, it's not in my nature. Also happy to share birding spots and techniques. I know where all the owls nest within twenty miles." }
    ]
  },
  {
    email: 'linda.foster@test.com',
    firstName: 'Linda',
    lastName: 'Foster',
    profileSummary: `Linda Foster taught middle school science for twenty-eight years and credits that career with her lifelong love of being outdoors and paying attention to the natural world. She's a regular on local hiking trails and has recently gotten serious about birding, bringing her science teacher's eye for observation to both hobbies. Linda is also an avid watercolor painter who documents the landscapes and birds she encounters on the trail.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Teaching middle schoolers science for almost thirty years kept me young and curious. I'm out on trails three or four times a week now - it's my mental health practice. And I've started birding seriously this year. There's this wonderful crossover between hiking and birding where you're already in the right places for both." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Hiking is non-negotiable - rain or shine, I'm out. I know every trail within fifteen miles intimately. I've started bringing binoculars on every hike, which has slowed me down considerably but shown me things I was walking right past for years. Working through a field guide systematically." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Never married, no kids of my own, but I've got wonderful nieces and nephews who visit in the summer. Several of my former students have become real friends - when they come back and tell me they still love science, that's everything." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I'd love hiking companions - there's something much better about sharing a great view. Also happy to compare birding notes with anyone who's getting into it. I teach occasional nature journaling workshops if there's interest." }
    ]
  },
  {
    email: 'martin.davis@test.com',
    firstName: 'Martin',
    lastName: 'Davis',
    profileSummary: `Martin Davis is a retired high school biology teacher who has been birding since he was eleven years old - over fifty years now. His life list exceeds 600 species, he's led Audubon Society field trips for two decades, and he can identify most birds by ear alone. Though he claims to have slowed down, neighbors regularly spot him at dawn with binoculars pointed at something invisible in the treetops.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Birding has been my thing since I was a kid. Fifty-plus years of it. Over 600 species on my life list. I've led Audubon field trips for twenty years. It's not just a hobby, it's genuinely how I see the world. I walk outside and I'm immediately cataloging: what's calling, what's moving, what's different from yesterday." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "Birding, birding, and more birding. I'm usually out at dawn. I keep detailed records in eBird - you can see my entire birding history going back decades. I've also started mentoring younger birders, which is deeply satisfying. Passing on the obsession." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Married to a patient woman who has attended exactly one bird walk in thirty years of marriage and pronounced it very nice before going home early. Two adult kids who tolerate my birding enthusiasm with good humor. Grandkids haven't caught the bug yet but I'm working on them." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I am always available to go birding with anyone, from absolute beginners to experienced birders. No question is too basic. I lead free neighborhood bird walks whenever there's interest. The more people love birds, the better for birds." }
    ]
  },
  {
    email: 'richard.brown@test.com',
    firstName: 'Richard',
    lastName: 'Brown',
    profileSummary: `Richard Brown worked for the postal service for thirty-two years and knows this neighborhood better than anyone - every street, every shortcut, every house. Now retired, he's channeled his love of being outside into a community garden plot and serious bread baking. His sourdough loaves have developed a neighborhood following, and his plot at the community garden is notably the most organized and productive.`,
    profileAnswers: [
      { sectionId: 'identity', question: 'What makes you, you?', transcript: "Thirty-two years as a mail carrier means I walked ten to fifteen miles a day and knew every inch of this community. I miss the walking and I miss the people, honestly. Now I stay connected through the community garden and through baking for neighbors. Different kind of rounds." },
      { sectionId: 'lifestyle', question: 'How do you spend your free time?', transcript: "I've got a plot at the community vegetable garden - growing tomatoes, beans, squash, whatever I can fit. And I bake most days. Started with bread during retirement and now I can't stop. Sourdough, whole wheat, rye. My wife says we're drowning in bread, which is not the worst problem." },
      { sectionId: 'relationships', question: 'Tell us about your family', transcript: "Married thirty-five years, two adult kids, four grandkids. Big family gatherings are my favorite thing. I'm the one who brings multiple loaves of bread to every holiday. The grandkids call me 'the bread grandpa' which I consider a great honor." },
      { sectionId: 'community', question: 'What would you like to share with neighbors?', transcript: "I know everyone in this neighborhood, or I will soon. Happy to share bread - seriously, I have too much. Also happy to talk vegetable gardening, especially what grows well in this soil and climate specifically." }
    ]
  }
];

async function main() {
  console.log('Adding test profiles for circles testing...');

  // Find the Test Community Alpha
  const community = await prisma.community.findFirst({
    where: {
      organization: 'Test Community Alpha'
    }
  });

  if (!community) {
    console.error('Test Community Alpha not found! Run the main seed first.');
    process.exit(1);
  }

  console.log(`Found community: ${community.organization} (${community.id})`);

  const hashedPassword = await bcrypt.hash('testpassword123', 12);

  for (const profile of testProfiles) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: profile.email }
    });

    if (existing) {
      console.log(`User ${profile.email} already exists, updating profile...`);
      await prisma.user.update({
        where: { email: profile.email },
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          profileSummary: profile.profileSummary,
          profileAnswers: profile.profileAnswers,
          profilePublished: true
        }
      });
    } else {
      console.log(`Creating user ${profile.email}...`);
      await prisma.user.create({
        data: {
          email: profile.email,
          passwordHash: hashedPassword,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: 'MEMBER',
          communityId: community.id,
          profileSummary: profile.profileSummary,
          profileAnswers: profile.profileAnswers,
          profilePublished: true
        }
      });
    }
  }

  console.log('\n✓ Test profiles added successfully!');
  console.log(`\nAdded ${testProfiles.length} profiles to Test Community Alpha`);
  console.log('\nExpected circles (member counts):');
  console.log('- Birders: 8 (Margaret, Carol, Elena, James, Barbara, William, Linda, Martin)');
  console.log('- Gardeners: 7 (Margaret, James, Patricia, Carol, George, William, Richard)');
  console.log('- Hikers: 6 (Robert, David, Michael, Nancy, Linda, Martin? or fewer)');
  console.log('- Bakers: 4 (Susan, Patricia, Elena, Barbara)');
  console.log('- Readers: 3 (Susan, Patricia, Thomas)');
  console.log('- Woodworkers: 3 (Robert, David, Thomas)');
  console.log('\nAll test users use password: testpassword123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
