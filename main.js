'use strict';

const { Plugin, PluginSettingTab, Setting, Modal, Notice, requestUrl, normalizePath } = require('obsidian');

/* ============================================================
 * Type definitions for the 3 DET Writing tasks
 * ============================================================ */
const TYPE_INFO = {
  photo: {
    id: 'photo',
    label: 'Write About the Photo',
    folder: '01-Write-About-the-Photo',
    prepSeconds: 0, // 준비 시간 없음
    answerSeconds: 60, // 1분
    multiPart: false,
    description: '화면에 제시된 실제 생활 사진을 묘사하여 1분 동안 글을 씁니다. (권장: 30-50단어)',
    targetWords: '30-50',
  },
  interactive: {
    id: 'interactive',
    label: 'Interactive Writing',
    folder: '02-Interactive-Writing',
    prepSeconds: 20, // 1단계 준비 시간 20초
    answerSeconds: 300, // 1단계 5분 작성 / 2단계 3분 작성
    followUpSeconds: 180, // 2단계 follow-up 3분 작성
    multiPart: true,
    description: '주어진 주제에 대해 5분간 에세이를 쓴 후, AI의 연계 질문에 3분간 추가 답변을 작성합니다.',
    targetWords: '100+',
  },
  sample: {
    id: 'sample',
    label: 'Writing Sample',
    folder: '03-Writing-Sample',
    prepSeconds: 30, // 준비 시간 30초
    answerSeconds: 300, // 에세이 5분 작성
    multiPart: false,
    description: '주어진 심도 있는 에세이 프롬프트에 대해 5분 동안 서론-본론-결론을 갖춰 글을 씁니다. (권장: 120-160단어)',
    targetWords: '120-160',
  },
};

const TYPE_ORDER = ['photo', 'interactive', 'sample'];

/* ============================================================
 * Preset photos for "Write About the Photo" (Cambridge PET/DET style)
 * ============================================================ */
const PRESET_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80', scene: 'A warm family cooking together in a bright kitchen. A young boy is carefully slicing cucumbers on a chopping board while his parents look on with smiles.', query: 'family cooking kitchen vegetables together smile' },
  { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80', scene: 'A cozy, modern cafe filled with green plants and warm hanging lights. Customers are working on laptops and having quiet conversations.', query: 'cozy cafe interior design plants people working' },
  { url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop&q=80', scene: 'A group of friends laughing and enjoying a picnic in a sunny park. Food is laid out on a checkered blanket on the lush green grass.', query: 'friends picnic grass park summer sunny' },
  { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80', scene: 'A diverse group of university students sitting around a wooden library table, pointing at a laptop screen and sharing study notes.', query: 'students studying university library group discussion' },
  { url: 'https://images.unsplash.com/photo-1488459718432-36c55e79926e?w=800&auto=format&fit=crop&q=80', scene: 'A bustling local farmer\'s market with clean wooden stalls displaying fresh, colorful fruits and vegetables. Customers are inspecting the produce.', query: 'outdoor market vegetables fruits grocery shopping' },
  { url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&auto=format&fit=crop&q=80', scene: 'Two professional chefs in neat white uniforms busy cooking at a high-speed stove in a clean, modern commercial restaurant kitchen.', query: 'chefs cooking professional kitchen restaurant' },
  { url: 'https://images.unsplash.com/photo-1532103054090-334e6e60ab29?w=800&auto=format&fit=crop&q=80', scene: 'Commuters waiting for their train on an outdoor railway platform on a sunny day. Some are looking at their phones, others carrying suitcases.', query: 'railway platform commuters train station suitcase' },
  { url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80', scene: 'A person with muddy gardening gloves tending to beautiful green potted plants and flowers on a sunny suburban balcony garden.', query: 'gardening gloves planting flowers balcony garden' },
  { url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80', scene: 'A bright orange tent pitched in a scenic pine forest at dusk. A cozy campfire is burning, and camping gear lies nearby.', query: 'camping tent campfire pine forest night' },
  { url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', scene: 'Several people working out in a spacious, well-equipped modern gym. One person is lifting dumbbells while others run on treadmills.', query: 'fitness gym workout training dumbbells' },
  { url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop&q=80', scene: 'A creative artist\'s studio room scattered with colorful acrylic paints, canvases, brushes, and drawing tools on a wooden work table.', query: 'art studio paint brushes canvas creative' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80', scene: 'A breathtaking view of a wide sandy beach under a blue sky, with a few sun loungers, beach umbrellas, and light blue waves washing ashore.', query: 'beach sand umbrella ocean holiday tropical' },
  { url: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=800&auto=format&fit=crop&q=80', scene: 'Office coworkers gathered around a laptop in a bright, stylish conference room, smiling and collaborating on a new business project.', query: 'office coworkers meeting business project cooperation' },
  { url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop&q=80', scene: 'Pedestrians holding colorful umbrellas walking down a wet, glowing city street at night, with shop signs reflecting in rain puddles.', query: 'rainy city night pedestrians umbrellas wet street' },
  { url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80', scene: 'A stylish woman carrying several vibrant paper shopping bags, smiling and walking down a modern high street department shopping district.', query: 'woman shopping bags department street mall' },
  { url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&fit=crop&q=80', scene: 'A happy man walking a fluffy golden retriever on a leash along a green park trail during a crisp, sunny afternoon.', query: 'man walking dog golden retriever park leash' },
  { url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80', scene: 'A cheerful family gathered around a wooden dining table in a cozy living room, passionately playing a colorful board game together.', query: 'family playing board game table home fun' },
  { url: 'https://images.unsplash.com/photo-1532372320978-9b4d7a92b24d?w=800&auto=format&fit=crop&q=80', scene: 'A young couple assembling a wooden bookshelf flat-pack DIY furniture in their new bright apartment, looking at the instruction manual.', query: 'couple assembling furniture flatpack DIY apartment' },
  { url: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&auto=format&fit=crop&q=80', scene: 'A fluffy cat curled up asleep on a soft woolen blanket next to a steaming mug of hot tea and an open book on a cozy sofa.', query: 'cozy home cat sleeping book tea mug' },
  { url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&auto=format&fit=crop&q=80', scene: 'A professional photographer holding a large camera, taking photos of beautiful models on an active urban city street backdrop.', query: 'photographer camera taking photo street urban' },
  { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80', scene: 'A dynamic lecturer giving a presentation in a large university lecture hall with rows of active students listening.', query: 'lecturer presentation university hall auditorium' },
  { url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80', scene: 'A hiker with a large backpack standing atop a rocky mountain ridge, admiring the expansive valley scenery below.', query: 'hiker mountain backpack altitude landscape' },
  { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80', scene: 'A tourist boat sailing down a scenic river surrounded by towering green hills and clear blue skies during summer.', query: 'boat river tourist hills scenery sky' },
  { url: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&auto=format&fit=crop&q=80', scene: 'A wooden table lavishly spread with various healthy dishes, salads, and fresh fruits for a friendly feast.', query: 'table food plates feast salad healthy' },
  { url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80', scene: 'A small traditional bakery counter filled with freshly baked bread, baguettes, and crispy golden croissants.', query: 'bakery bread baguettes croissants counter shop' },
  { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80', scene: 'A professional pediatrician checking a young child\'s breathing with a stethoscope in a bright, friendly clinic room.', query: 'doctor child pediatrician clinic stethoscope' },
  { url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80', scene: 'A high school teacher writing English vocabulary on a clean green blackboard while students take notes in class.', query: 'teacher class blackboard students lesson education' },
  { url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80', scene: 'A professional car mechanic working under a lifted car chassis in a bright, well-organized automobile repair shop.', query: 'mechanic car garage repair vehicle service' },
  { url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80', scene: 'A friendly real estate agent explaining contract details to a young couple inside a bright, newly built house.', query: 'agent contract real estate couple house apartment' },
  { url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=80', scene: 'A freelancer having a video conference call on a laptop at a modern wooden table, holding a white coffee mug.', query: 'freelancer video conference call laptop coffee' },
  { url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80', scene: 'A beautifully decorated living room prepared for a birthday party, with colorful balloons floating near the ceiling.', query: 'birthday party balloons decorations living room home' },
  { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80', scene: 'A skilled Japanese chef delicately preparing fresh sushi rolls on a clean wooden cutting board in a sushi bar.', query: 'chef sushi restaurant preparing cutting board food' },
  { url: 'https://images.unsplash.com/photo-1567306301408-9b74779a11af?w=800&auto=format&fit=crop&q=80', scene: 'A florist carefully arranging beautiful fresh roses and green leaves inside a charming boutique flower shop.', query: 'florist flowers flower shop roses arrangement creative' },
  { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=80', scene: 'A group of primary school children sitting on a colorful carpet, looking at a tablet screen and laughing together.', query: 'children tablet carpet classroom learning fun' },
  { url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', scene: 'A colorful grocery supermarket aisle stocked with piles of fresh red onions and white garlic bulbs.', query: 'grocery supermarket onions garlic fresh produce vegetables' },
  { url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80', scene: 'A lively group of friends clinking glasses and chatting around a dinner table on a beautiful outdoor restaurant terrace.', query: 'friends dinner outdoor terrace restaurant chatting toast' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', scene: 'An energetic rock band playing live on a brightly lit concert stage, with an excited crowd of fans watching.', query: 'band live rock concert stage lights crowd fans' },
  { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80', scene: 'A young man happily playing an acoustic guitar and singing in his cozy, light-filled bedroom.', query: 'man playing guitar acoustic bedroom singing hobby' },
  { url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80', scene: 'A group of friends lying on a cozy bed with their domestic dogs, laughing and talking warmly.', query: 'friends bed dogs pets talking laughing cozy' },
  { url: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800&auto=format&fit=crop&q=80', scene: 'A professional hairdresser giving a stylish haircut to a female customer in a clean, modern hair salon.', query: 'hairdresser haircut female customer salon beauty' },
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80', scene: 'A happy family gathering around a smoking backyard barbecue grill, preparing delicious meats on a sunny afternoon.', query: 'family barbecue grill meat backyard garden sunny' },
  { url: 'https://images.unsplash.com/photo-1588880331149-6ee4b280f474?w=800&auto=format&fit=crop&q=80', scene: 'A bright blue swimming pool on a hot summer day, with colorful inflatable rings floating on the sparkling water.', query: 'swimming pool summer hot inflatable ring water holiday' },
  { url: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800&auto=format&fit=crop&q=80', scene: 'A potter molding wet clay on a rotating pottery wheel inside a rustic ceramic craft workshop.', query: 'pottery potter clay wheel craft ceramic workshop' },
  { url: 'https://images.unsplash.com/photo-1513829096960-ef0417bb9171?w=800&auto=format&fit=crop&q=80', scene: 'A customer browsing high wooden bookshelves in a quiet, cozy independent neighborhood bookstore.', query: 'bookstore browsing books bookshelves library quiet' },
  { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80', scene: 'A group of young people practicing yoga poses together on green mats in a peaceful outdoor public park.', query: 'yoga park outdoor mats healthy group exercise' },
  { url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80', scene: 'A professional software engineer intently coding on dual glowing monitors in a modern, dark-themed IT office.', query: 'programmer coding dual monitors office developer' },
  { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80', scene: 'A business manager giving a presentation pointing at a white whiteboard during a boardroom conference.', query: 'manager presentation whiteboard board meeting corporate' },
  { url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80', scene: 'Team members sitting around a modern corporate table, reviewing documents and discussing data on a tablet.', query: 'meeting office team tablet discussion corporate data' },
  { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', scene: 'An open notebook, a modern smartphone, and large studio headphones sitting on a rustic wooden work desk.', query: 'headphones phone notebook desk work audio music' },
  { url: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=800&auto=format&fit=crop&q=80', scene: 'A winding asphalt road stretching through a dense, misty green forest on a quiet rainy afternoon.', query: 'road forest mist rain asphalt travel quiet' },
  { url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&auto=format&fit=crop&q=80', scene: 'A young athletic man in swim trunks carrying a surf board under his arm, walking along a wide sandy beach.', query: 'surfing surfer board beach sand ocean athletic' },
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80', scene: 'A small camper tent pitched on a green meadow in front of Yosemite\'s magnificent mountain cliffs at sunset.', query: 'camping tent meadow mountains cliff sunset yosemite' },
  { url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=80', scene: 'A peaceful paved path winding through a beautiful autumn forest with golden-leaved trees glowing in the sunlight.', query: 'path forest autumn fall gold trees leaves sun' },
  { url: 'https://images.unsplash.com/photo-1500051644794-0cfc74389f1d?w=800&auto=format&fit=crop&q=80', scene: 'A quiet silhouette of a fisherman casting a line from a wooden pier into a calm lake at sunrise.', query: 'fisherman lake sunrise pier silhouette fishing' },
  { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80', scene: 'Two cute school backpacks and a stack of colorful textbooks sitting on a clean school classroom desk.', query: 'backpack school desk textbook class education kids' },
  { url: 'https://images.unsplash.com/photo-1552581234-2612b75d8953?w=800&auto=format&fit=crop&q=80', scene: 'A lively group of business designers sticking colorful post-it notes on a glass wall during a brainstorming session.', query: 'brainstorming postit notes office team designers wall' },
  { url: 'https://images.unsplash.com/photo-1551632811-561730d1e4a6?w=800&auto=format&fit=crop&q=80', scene: 'An active hiker using hiking poles, standing proudly at the summit of a rocky peak under a clear blue sky.', query: 'hiker mountain poles summit outdoor' },
  { url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=80', scene: 'A crowded, energetic dance floor inside a modern nightclub with purple and blue flashing strobe lights.', query: 'club dance floor lights nightclub music crowd party' },
  { url: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&auto=format&fit=crop&q=80', scene: 'A neatly arranged wardrobe closet with various stylish suits, jackets, and shirts hanging in a row.', query: 'wardrobe closet hanging suits jackets clothes neat' },
  { url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80', scene: 'A research scientist adjusting a humanoid robot prototype in a futuristic engineering laboratory.', query: 'scientist robot prototype engineer research lab hightech' },
  { url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&auto=format&fit=crop&q=80', scene: 'A group of happy young friends clinking glasses of beer during a celebration around a crowded bar counter.', query: 'friends toast beer glasses bar celebration' },
  { url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&auto=format&fit=crop&q=80', scene: 'Two students sitting side-by-side on a wooden bench, focused on reading thick textbooks together.', query: 'students reading bench textbooks studying library' },
  { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80', scene: 'Two office colleagues in smart-casual attire having an active, smiling discussion in a bright office break room.', query: 'discussion colleagues coworkers office talk coffee break' },
  { url: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&auto=format&fit=crop&q=80', scene: 'A young couple wearing bicycle helmets, smiling warmly beside their bikes on a scenic outdoor forest trail.', query: 'couple bicycles helmets path forest sunny active' },
  { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80', scene: 'A fit young woman jogger running on a modern treadmill in a well-lit commercial gym room.', query: 'woman running treadmill gym workout fitness jogger' },
  { url: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=800&auto=format&fit=crop&q=80', scene: 'A barista carefully pouring steamed milk into a ceramic cup, crafting an elegant leaf-patterned latte art.', query: 'latte art barista pouring milk coffee espresso cup' },
  { url: 'https://images.unsplash.com/photo-1520333789090-1afc82db536a?w=800&auto=format&fit=crop&q=80', scene: 'A young woman sitting on a public city bench, smiling as she scrolls on her modern smartphone.', query: 'woman bench phone city park street communication' },
  { url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80', scene: 'High school friends walking down a bright school corridor, carrying backpacks and chatting happily.', query: 'friends corridor school hallway backpacks students' },
  { url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80', scene: 'A supermarket cashier processing a card payment, while the customer holds the terminal screen.', query: 'cashier payment credit card terminal store checkout' },
  { url: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&auto=format&fit=crop&q=80', scene: 'A beautifully plated hot plate of Italian spaghetti pasta with fresh tomato sauce and green basil on a restaurant table.', query: 'pasta spaghetti tomato sauce restaurant dining basil' },
  { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80', scene: 'A happy elderly couple sitting on their front porch, petting their adorable golden retriever dog.', query: 'couple porch grandparents petting dog golden retriever' },
  { url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80', scene: 'Graduating university students throwing their black mortarboard caps high into the air against a bright blue sky.', query: 'graduation graduation caps throw sky university students' },
  { url: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9b084?w=800&auto=format&fit=crop&q=80', scene: 'A young male athlete in a sporty outfit delivering a powerful serve on an outdoor green tennis court.', query: 'tennis serve court player serve sports athletic' },
  { url: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800&auto=format&fit=crop&q=80', scene: 'Art museum visitors quietly standing in front of large oil paintings, admiring the classical artwork.', query: 'museum art painting gallery classical visitors quiet' },
  { url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80', scene: 'Customers sitting in neat queues in front of modern bank teller counters waiting for their numbers to be called.', query: 'bank counters queue customer wait service teller' },
  { url: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=800&auto=format&fit=crop&q=80', scene: 'A pediatrician using a toy stethoscope to playfully examine a smiling toddler in a colorful medical office.', query: 'doctor toddler clinic toys stethoscope pediatrician' },
  { url: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800&auto=format&fit=crop&q=80', scene: 'A white workspace desk surface cluttered with various bright colorful post-it notes, pens, and an open planner notebook.', query: 'desk notes postit planner pens workplace colorful' },
  { url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=80', scene: 'Rows of neatly organized wooden bookshelves filled with thousands of books in a spacious library building.', query: 'library bookshelves books room interior university' },
  { url: 'https://images.unsplash.com/photo-1508847154043-be12a62861c1?w=800&auto=format&fit=crop&q=80', scene: 'A university professor giving a lecture to hundreds of students in a large, modern tiered university amphitheater.', query: 'lecture professor university amphitheatertiered class' },
  { url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80', scene: 'Community volunteers using shovels to plant young green tree saplings in a public soil park.', query: 'volunteers planting trees park sapling shovel earth' },
  { url: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800&auto=format&fit=crop&q=80', scene: 'A remote freelancer working on a laptop while relaxing in a cozy bedroom bed with warm soft blankets.', query: 'bedroom work laptop bed freelancer homeoffice' },
  { url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&auto=format&fit=crop&q=80', scene: 'A massive crowd of music fans holding glowing neon light sticks at an outdoor night music festival concert.', query: 'concert night festival light sticks crowd fans neon' },
  { url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80', scene: 'A young man jogging along a beautiful coastline sandy path during a calm, golden ocean sunset.', query: 'jogging sunset beach path runner athletic coast' },
  { url: 'https://images.unsplash.com/photo-1521791136364-798a73053685?w=800&auto=format&fit=crop&q=80', scene: 'Two business professionals in formal suits shaking hands firmly over a wooden office conference table.', query: 'handshake business corporate meeting agreement contract' },
  { url: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&auto=format&fit=crop&q=80', scene: 'A modern dental clinic room showing a patient sitting in the dental chair while a dentist inspects teeth.', query: 'dentist clinic chair checkup teeth patient medical' },
  { url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80', scene: 'A collection of lush green house potted plants sitting on a sunny window sill, catching morning light.', query: 'plants window sun light indoor garden pots green' },
  { url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80', scene: 'A vintage library researcher using a magnifying glass to inspect an old, thick historical book.', query: 'book magnifying glass researcher history library vintage' },
  { url: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800&auto=format&fit=crop&q=80', scene: 'A professional swimmer launching off a blue starting block into the clean blue water of an indoor competition pool.', query: 'swimming pool starting block swimmer competition' },
  { url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&auto=format&fit=crop&q=80', scene: 'A group of kindergarten children sitting around tables, busy with scissors, glue, and colorful paper crafts.', query: 'craft kindergarten children paper art school creative' },
  { url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80', scene: 'Two happy young dogs playing and running together on a green grassy meadow on a sunny morning.', query: 'dogs playing grass meadow pets runs puppy' },
  { url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80', scene: 'A senior manager pointing at a desktop screen, actively coaching and training a new employee at an office desk.', query: 'training coach employee manager screen office' },
  { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=80', scene: 'A tourist checking in at a luxury hotel front desk, with a receptionist giving them a room key card.', query: 'hotel lobby checkin tourist keycard receptionist' },
  { url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&auto=format&fit=crop&q=80', scene: 'A young parent lifting their child up to feed a tall giraffe at an outdoor interactive zoo enclosure.', query: 'zoo child giraffe feed parent family animals' },
  { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80', scene: 'A motorcyclist wearing a high-quality helmet and heavy protective leather gear, riding on a scenic mountain highway.', query: 'motorcycle rider highway helmet mountain curves' },
  { url: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&auto=format&fit=crop&q=80', scene: 'Toddlers playing on a modern outdoor playground, sliding down a blue slide and playing in the sand.', query: 'playground kids slide sand outdoors park summer' },
  { url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&auto=format&fit=crop&q=80', scene: 'A mother holding a newborn baby in a bright nursery room, looking out the window with a gentle smile.', query: 'mother baby nursery home parenting bright' },
  { url: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800&auto=format&fit=crop&q=80', scene: 'A professional baker dusting white flour over fresh bread dough on a clean marble table.', query: 'baker bread flour dough bakery preparing hand' },
  { url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format&fit=crop&q=80', scene: 'A elegant waiter pouring white wine into a glass for a couple at a high-end restaurant dinner table.', query: 'waiter restaurant wine glass couple dining service' },
  { url: 'https://images.unsplash.com/photo-1506869648419-fd4c5494dded?w=800&auto=format&fit=crop&q=80', scene: 'Two home painters wearing paint-spattered overalls, using rollers to paint a living room wall light blue.', query: 'painters painting wall home renovation rollers overalls' },
  { url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80', scene: 'A relaxed elderly man sitting on a foldable chair on a riverbank, holding a long fishing rod on a calm morning.', query: 'fishing riverbank man fishing rod quiet outdoor' }
];

const DEFAULT_SETTINGS = {
  provider: 'openai',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  claudeApiKey: '',
  claudeModel: 'claude-3-5-haiku-20241022',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash-lite',
  sonarApiKey: '',
  sonarModel: 'sonar',
  outputFolder: 'DET-Writing-Practice',
  autoSave: true,
  generateModel: true,
  imageSearch: false,
};

/* ============================================================
 * LLM API Callers
 * ============================================================ */
async function callOpenAI(settings, system, user, opts = {}) {
  if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  const res = await requestUrl({
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: opts.temperature ?? 0.7,
    }),
    throw: false,
  });
  if (res.status >= 400) throw new Error(`OpenAI 오류 (${res.status}): ${truncate(res.text)}`);
  return res.json.choices[0].message.content;
}

async function callClaude(settings, system, user, opts = {}) {
  if (!settings.claudeApiKey) throw new Error('Claude API 키가 설정되지 않았습니다.');
  const res = await requestUrl({
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': settings.claudeApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.claudeModel,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      system: system,
      messages: [{ role: 'user', content: user }],
    }),
    throw: false,
  });
  if (res.status >= 400) throw new Error(`Claude 오류 (${res.status}): ${truncate(res.text)}`);
  return res.json.content[0].text;
}

async function callGemini(settings, system, user, opts = {}) {
  if (!settings.geminiApiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`;
  const res = await requestUrl({
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: opts.temperature ?? 0.7 },
    }),
    throw: false,
  });
  if (res.status >= 400) throw new Error(`Gemini 오류 (${res.status}): ${truncate(res.text)}`);
  const parts = res.json.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join('');
}

async function callSonar(settings, system, user, opts = {}) {
  if (!settings.sonarApiKey) throw new Error('Sonar(Perplexity) API 키가 설정되지 않았습니다.');
  const body = {
    model: settings.sonarModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: opts.temperature ?? 0.6,
  };
  if (opts.returnImages) body.return_images = true;
  const res = await requestUrl({
    url: 'https://api.perplexity.ai/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.sonarApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    throw: false,
  });
  if (res.status >= 400) throw new Error(`Sonar 오류 (${res.status}): ${truncate(res.text)}`);
  return { text: res.json.choices?.[0]?.message?.content || '', raw: res.json };
}

async function callLLM(settings, system, user, opts = {}) {
  switch (settings.provider) {
    case 'openai': return callOpenAI(settings, system, user, opts);
    case 'claude': return callClaude(settings, system, user, opts);
    case 'gemini': return callGemini(settings, system, user, opts);
    case 'sonar': {
      const r = await callSonar(settings, system, user, opts);
      return r.text;
    }
    default: throw new Error(`알 수 없는 LLM 제공자: ${settings.provider}`);
  }
}

function truncate(s, n = 200) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '…' : s;
}

/* ============================================================
 * Image search (Sonar / Perplexity)
 * ============================================================ */
async function findPhotoUrl(settings, sceneDesc) {
  if (!settings.sonarApiKey) return null;
  try {
    const r = await callSonar(
      settings,
      'You search the web for ONE direct, hotlinkable image URL representing a real photograph. Output ONLY the bare URL - no markdown, no quotes, no explanation. URL must end in .jpg, .jpeg, .png, or .webp. Favor free high-quality stock photo sites like unsplash.com, pexels.com, or pixabay.com.',
      `Find one realistic stock photo matching this scene: ${sceneDesc}`,
      { returnImages: true, temperature: 0.2 }
    );
    const imgs = r.raw?.images;
    if (Array.isArray(imgs) && imgs.length) {
      const first = imgs[0];
      const url = typeof first === 'string' ? first : (first.image_url || first.url || null);
      if (url && isImageUrl(url)) return url;
    }
    const sr = r.raw?.search_results;
    if (Array.isArray(sr)) {
      for (const item of sr) {
        const u = item.image || item.thumbnail || item.url;
        if (u && isImageUrl(u)) return u;
      }
    }
    const m = (r.text || '').match(/https?:\/\/[^\s)\]"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s)\]"'<>]*)?/i);
    if (m) return m[0];
    return null;
  } catch (e) {
    console.warn('[DET Writing] Photo search failed:', e);
    return null;
  }
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);
}

/* ============================================================
 * Question generation prompts
 * ============================================================ */
function buildQuestionPrompt(typeId, recentTopics) {
  const avoid = recentTopics.length
    ? `\n\nIMPORTANT: Avoid topics overlapping with these recent ones — ${recentTopics.slice(0, 8).join(' | ')}`
    : '';

  if (typeId === 'photo') {
    // Photo는 API가 scene_description 및 search query를 JSON으로 반환하고, 실제 이미지를 Unsplash 프리셋 or Sonar 검색으로 띄웁니다.
    return {
      system: 'You generate Duolingo English Test (DET) "Write About the Photo" practice scenes. Return STRICT JSON only — no markdown, no commentary.',
      user: `Generate ONE realistic everyday-life scene for DET Photo Writing practice. 
The scene should contain clear human actions, settings, and emotions, similar to Cambridge PET or DET picture items (e.g. people shopping, reading, studying, gardening, drinking coffee).
Return ONLY this JSON object:
{
  "scene_description": "A vivid 2-3 sentence English description of what is happening in the photo.",
  "image_search_query": "5-7 word search query optimized for stock photos (e.g. 'young family planting tree garden').",
  "topic_tag": "Short 2-3 word topic tag."
}${avoid}`,
    };
  }

  if (typeId === 'interactive') {
    return {
      system: 'You generate Duolingo English Test (DET) "Interactive Writing" prompts. Each prompt is 1-3 sentences. Return STRICT JSON only.',
      user: `Generate ONE realistic DET Interactive Writing prompt in the style of these real DET writing prompts:
- "Are there any buildings in your city or town that you think are particularly beautiful or important? Describe one in detail, and explain why you think it's unique or significant."
- "If you could have dinner with any celebrity, who would it be and why?"
- "Do you think that people should prioritize work-life balance over career advancement? Explain your view."
- "Describe a tradition or custom from your culture that you find meaningful. Why is it important to you?"
- "Some people believe that social media has made people more connected, while others think it has made people more isolated. Which view do you agree with, and why?"

The prompt should ask about personal experiences, social opinions, general preferences, or creative ideas.
Return ONLY this JSON object:
{
  "prompt": "The prompt question text.",
  "topic_tag": "Short 2-3 word topic tag."
}${avoid}`,
    };
  }

  if (typeId === 'sample') {
    return {
      system: 'You generate Duolingo English Test (DET) "Writing Sample" prompts. Each prompt is 1-3 sentences. Return STRICT JSON only.',
      user: `Generate ONE realistic DET Writing Sample prompt in the style of these real DET essay prompts:
- "Do you think people learn better by being told what to do or by being shown what to do? Use examples from personal experience and observations to explain your perspective."
- "Some people argue that it is not necessary to have clear boundaries between a person's work and personal life. Do you agree or disagree with this view, and why?"
- "Tell me about someone you look up to. What makes you admire them so much?"
- "Do you think it is important for children to learn a second language at an early age? Use specific reasons and examples to support your answer."
- "Some people think that technology has made our lives more complicated rather than simpler. Do you agree or disagree? Explain your position."

Return ONLY this JSON object:
{
  "prompt": "The full detailed prompt question.",
  "topic_tag": "Short 2-3 word topic tag."
}${avoid}`,
    };
  }
  throw new Error('Unknown type: ' + typeId);
}

/* ============================================================
 * Interactive Writing Phase 2 Follow-up Question generator
 * ============================================================ */
function buildFollowUpPrompt(originalPrompt, userFirstEssay) {
  return {
    system: 'You are a DET writing system. Based on the original prompt and the user\'s first essay, generate ONE relevant follow-up question. The question must be short, sharp, and directly related to their essay. Keep it under 20 words. Output ONLY the raw question — no markdown, no quotes, no extra text.',
    user: `Original Prompt: "${originalPrompt}"\nUser's First Essay: "${userFirstEssay}"\n\nGenerate one short follow-up question:`,
  };
}

/* ============================================================
 * Model Answer & Feedback Prompt (Corrections + Model Essay + Expressions)
 * ============================================================ */
function buildFeedbackPrompt(typeId, questionData, userEssay, followUpData = null) {
  const info = TYPE_INFO[typeId];
  let contextText = '';
  
  if (typeId === 'photo') {
    contextText = `Task: Write About the Photo\nPhoto Scene Context: "${questionData.scene_description}"\nUser's Written Essay: "${userEssay}"`;
  } else if (typeId === 'interactive') {
    contextText = `Task: Interactive Writing\nOriginal Prompt: "${questionData.prompt}"\nUser's Phase 1 Essay: "${userEssay}"\nAI Follow-up Question: "${followUpData.question}"\nUser's Phase 2 Reply: "${followUpData.reply}"`;
  } else {
    contextText = `Task: Writing Sample\nPrompt: "${questionData.prompt}"\nUser's Written Essay: "${userEssay}"`;
  }

  return {
    system: `You are an elite, professional Duolingo English Test (DET) writing tutor.
Analyze the user's essay and generate detailed constructive feedback.
Keep the system prompts highly optimized to minimize token consumption.

You MUST follow this EXACT Markdown structure (use the headers exactly as shown):

## Corrections
(Analyze the user's essay for grammar, vocabulary, spelling, and style errors. Provide the corrections in a markdown table format with a clear, concise Korean explanation of why it was changed. If there are no errors, output "No major errors found!")
| Original | Correction | Explanation (Korean) |
|---|---|---|
| user's incorrect fragment | corrected fragment | 한국어 교정 설명 |

## Model Essay
(Generate a premium high-scoring model essay, 130-150 score level (CEFR B2-C1), based directly on the user's ideas, arguments, or photo description. Ensure it has sophisticated vocabulary, varied syntax, and strong cohesion. Word count target: ${info.targetWords} words.)

## Useful Expressions
(Extract 5 to 8 reusable, transferable, high-level English expressions or transitional phrases from the model essay. Do NOT pick topic-specific vocabulary; instead, pick phrases the student can reuse in other DET essays. Translate each to Korean.)
- "Sophisticated expression or transition phrase" — 한국어 뜻 및 짧은 쓰임새 한 줄`,
    user: `Here is the writing context for feedback:\n\n${contextText}\n\nGenerate the corrections table, model essay, and useful expressions.`,
  };
}

/* ============================================================
 * JSON and Expression Parsers
 * ============================================================ */
function extractJson(text) {
  if (!text) throw new Error('빈 응답');
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  throw new Error('JSON 파싱 실패: ' + truncate(text, 100));
}

function parseUsefulExpressions(modelText) {
  if (!modelText) return [];
  const lines = modelText.split('\n');
  let inSection = false;
  const items = [];
  for (const line of lines) {
    if (/^##\s+Useful Expressions/i.test(line)) { inSection = true; continue; }
    if (inSection && /^##\s+/.test(line)) break;
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      const full = m[1].trim();
      const split = full.match(/^(.+?)\s+[—–-]\s+(.+)$/);
      if (split) {
        const eng = split[1].replace(/^["“‘]|["”’]$/g, '').trim();
        const ko = split[2].trim();
        items.push({ english: eng, korean: ko });
      } else {
        items.push({ english: full, korean: '' });
      }
    }
  }
  return items;
}

function parseCorrectionsSection(modelText) {
  if (!modelText) return '';
  const idx = modelText.search(/^##\s+Corrections/im);
  if (idx === -1) return '';
  const nextIdx = modelText.search(/^##\s+Model Essay/im);
  if (nextIdx === -1) return modelText.substring(idx).trim();
  return modelText.substring(idx, nextIdx).trim();
}

function parseModelEssaySection(modelText) {
  if (!modelText) return '';
  const idx = modelText.search(/^##\s+Model Essay/im);
  if (idx === -1) return modelText;
  const nextIdx = modelText.search(/^##\s+Useful Expressions/im);
  if (nextIdx === -1) return modelText.substring(idx).trim();
  return modelText.substring(idx, nextIdx).trim();
}

/* ============================================================
 * Vault saving utility
 * ============================================================ */
async function ensureFolder(vault, folderPath) {
  const parts = folderPath.split('/').filter(Boolean);
  let cur = '';
  for (const p of parts) {
    cur = cur ? `${cur}/${p}` : p;
    if (!(await vault.adapter.exists(cur))) {
      try { await vault.createFolder(cur); } catch {}
    }
  }
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatTimestamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function sanitizeFilename(s) {
  return (s || 'untitled').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').substring(0, 50);
}

async function saveSession(plugin, typeId, questionData, userEssay, modelText, photoUrl, followUpData = null) {
  const info = TYPE_INFO[typeId];
  const folder = normalizePath(`${plugin.settings.outputFolder}/${info.folder}`);
  await ensureFolder(plugin.app.vault, folder);

  const now = new Date();
  const ts = formatTimestamp(now);
  const tag = sanitizeFilename(questionData.topic_tag || 'writing-session');
  const filename = `${ts}_${tag}.md`;
  const path = normalizePath(`${folder}/${filename}`);

  const fm = [
    '---',
    `type: ${typeId}`,
    `date: ${now.toISOString().split('T')[0]}`,
    `provider: ${plugin.settings.provider}`,
    `topic: ${(questionData.topic_tag || '').replace(/"/g, '')}`,
    '---',
    '',
  ].join('\n');

  const body = [];

  if (typeId === 'photo') {
    body.push('# DET Write About the Photo Practice\n');
    if (photoUrl) body.push(`![photo](${photoUrl})\n`);
    body.push('### 🖼️ Scene description\n');
    body.push(`> ${questionData.scene_description}\n`);
    body.push('### ✍️ User\'s Essay\n');
    body.push(`${userEssay}\n`);
  } else if (typeId === 'interactive') {
    body.push('# DET Interactive Writing Practice\n');
    body.push('### 📝 Prompt\n');
    body.push(`> ${questionData.prompt}\n`);
    body.push('### ✍️ User\'s Phase 1 Essay\n');
    body.push(`${userEssay}\n`);
    if (followUpData) {
      body.push('### 💬 AI Follow-up Question\n');
      body.push(`> ${followUpData.question}\n`);
      body.push('### ✍️ User\'s Phase 2 Reply\n');
      body.push(`${followUpData.reply}\n`);
    }
  } else {
    body.push('# DET Writing Sample Practice\n');
    body.push('### 📝 Prompt\n');
    body.push(`> ${questionData.prompt}\n`);
    body.push('### ✍️ User\'s Essay\n');
    body.push(`${userEssay}\n`);
  }

  if (modelText) {
    body.push('\n---\n');
    body.push(modelText.trim());
  }

  await plugin.app.vault.adapter.write(path, fm + body.join('\n') + '\n');
  return path;
}

/* ============================================================
 * Recent topics tracker (in-memory)
 * ============================================================ */
class RecentTopics {
  constructor() { this.map = {}; }
  get(typeId) { return this.map[typeId] || []; }
  push(typeId, topic) {
    if (!topic) return;
    if (!this.map[typeId]) this.map[typeId] = [];
    this.map[typeId].unshift(topic);
    this.map[typeId] = this.map[typeId].slice(0, 10);
  }
}

/* ============================================================
 * Type Selector Modal
 * ============================================================ */
class TypeSelectorModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass('det-w-modal');
    contentEl.empty();
    
    const head = contentEl.createDiv({ cls: 'det-w-header' });
    head.createEl('h2', { text: '✍️ DET Writing Practice', cls: 'det-w-h2' });
    head.createEl('p', { text: '연습하고 싶은 듀오링고 라이팅 유형을 선택하세요. 모바일 환경에 완전 대응합니다.', cls: 'det-w-subtitle' });

    const body = contentEl.createDiv({ cls: 'det-w-body' });
    const grid = body.createDiv({ cls: 'det-w-type-grid' });

    for (const id of TYPE_ORDER) {
      const info = TYPE_INFO[id];
      const card = grid.createDiv({ cls: 'det-w-type-card' });
      card.createEl('h3', { text: info.label });
      
      const timeStr = id === 'interactive' 
        ? `준비 20초 / 1단계 5분 + 2단계 3분` 
        : (info.prepSeconds > 0 ? `준비 ${info.prepSeconds}초 / 작성 ${info.answerSeconds / 60}분` : `준비 없음 / 작성 ${info.answerSeconds / 60}분`);
      
      const timeBox = card.createDiv({ cls: 'det-w-type-time' });
      timeBox.createSpan({ text: '⏱️ ' + timeStr });
      
      card.createEl('div', { text: info.description, cls: 'det-w-type-desc' });
      
      card.addEventListener('click', () => {
        this.close();
        new PracticeModal(this.app, this.plugin, id).open();
      });
    }
  }
  onClose() { this.contentEl.empty(); }
}

/* ============================================================
 * Practice Modal — main workflow
 * ============================================================ */
class PracticeModal extends Modal {
  constructor(app, plugin, typeId) {
    super(app);
    this.plugin = plugin;
    this.typeId = typeId;
    this.info = TYPE_INFO[typeId];
    
    this.questionData = null;
    this.photoUrl = null;
    this.modelText = null;
    
    // Timer & Flow variables
    this.timerHandle = null;
    this.phase = 'loading'; // loading, ready, prep, write, followUpWrite, done
    
    // Essay inputs
    this.userFirstEssay = '';
    this.userSecondEssay = ''; // For interactive writing 2nd phase
    this.followUpQuestionText = ''; // Interactive writing follow-up question
  }

  async onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass('det-w-modal');
    modalEl.addClass('det-w-practice-modal');
    contentEl.empty();

    this.headerEl = contentEl.createDiv({ cls: 'det-w-header' });
    this.headerEl.createEl('h2', { text: this.info.label, cls: 'det-w-h2' });
    this.headerSubtitle = this.headerEl.createEl('div', { text: this.info.description, cls: 'det-w-subtitle' });

    this.bodyEl = contentEl.createDiv({ cls: 'det-w-body' });
    this.footerEl = contentEl.createDiv({ cls: 'det-w-footer' });

    this.renderLoading('AI 자동 문제 생성 중...');

    try {
      await this.generateQuestion();
      this.phase = 'ready';
      this.renderQuestion();
    } catch (e) {
      console.error(e);
      this.renderError(e.message);
    }
  }

  onClose() {
    this.clearTimer();
    this.contentEl.empty();
  }

  clearTimer() {
    if (this.timerHandle) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  renderLoading(msg) {
    this.bodyEl.empty();
    this.footerEl.empty();
    const wrap = this.bodyEl.createDiv({ cls: 'det-w-loading' });
    wrap.createDiv({ cls: 'det-w-spinner' });
    wrap.createDiv({ text: msg, cls: 'det-w-loading-text' });
  }

  renderError(msg) {
    this.bodyEl.empty();
    this.footerEl.empty();
    const wrap = this.bodyEl.createDiv({ cls: 'det-w-error' });
    wrap.createEl('div', { text: '⚠️ API 오류 발생', cls: 'det-w-error-title' });
    wrap.createEl('div', { text: msg, cls: 'det-w-error-msg' });
    wrap.createEl('div', {
      text: '설정 화면(설정 -> DET Writing Practice)에서 API 키와 모델 설정을 점검해 주세요.',
      cls: 'det-w-error-hint',
    });
    const btn = this.footerEl.createEl('button', { text: '닫기', cls: 'det-w-btn' });
    btn.addEventListener('click', () => this.close());
  }

  async generateQuestion() {
    const recent = this.plugin.recentTopics.get(this.typeId);
    const { system, user } = buildQuestionPrompt(this.typeId, recent);
    
    const raw = await callLLM(this.plugin.settings, system, user, { temperature: 0.85 });
    this.questionData = extractJson(raw);
    
    if (this.questionData.topic_tag) {
      this.plugin.recentTopics.push(this.typeId, this.questionData.topic_tag);
    }

    // 사진 묘사형 문제의 경우 사진 설정
    if (this.typeId === 'photo') {
      if (this.plugin.settings.imageSearch && this.plugin.settings.sonarApiKey) {
        this.renderLoading('인터넷에서 어울리는 사진 검색 중...');
        this.photoUrl = await findPhotoUrl(this.plugin.settings, this.questionData.image_search_query || this.questionData.scene_description);
      }
      
      // Sonar API가 없거나 검색에 실패한 경우 내장된 프리셋 20개에서 랜덤하게 추출 (Fallback)
      if (!this.photoUrl) {
        const rand = PRESET_PHOTOS[Math.floor(Math.random() * PRESET_PHOTOS.length)];
        this.photoUrl = rand.url;
        // 프리셋을 썼을 때는 문제 설명 또한 프리셋에 맞춰서 자연스럽게 대체하여 일치시킵니다.
        this.questionData.scene_description = rand.scene;
        this.questionData.topic_tag = rand.query;
      }
    }
  }

  renderQuestion() {
    this.bodyEl.empty();
    this.footerEl.empty();

    if (this.typeId === 'photo') {
      const qBox = this.bodyEl.createDiv({ cls: 'det-w-question det-w-question-photo' });
      if (this.photoUrl) {
        const wrapper = qBox.createDiv({ cls: 'det-w-photo-wrapper' });
        const img = wrapper.createEl('img', { cls: 'det-w-photo' });
        img.src = this.photoUrl;
        img.onerror = () => { wrapper.style.display = 'none'; };
      }
      
      // Photo 묘사는 실제 시험처럼 준비시간 없이 '즉시 에세이 시작'
      const startBtn = this.footerEl.createEl('button', { text: '✍️ 에세이 작성 시작 (1분)', cls: 'det-w-btn det-w-btn-primary' });
      const changeBtn = this.footerEl.createEl('button', { text: '🔄 다른 사진', cls: 'det-w-btn' });
      
      startBtn.addEventListener('click', () => this.startWritePhase(this.info.answerSeconds));
      changeBtn.addEventListener('click', () => this.regenerateQuestion());
    } else {
      const qBox = this.bodyEl.createDiv({ cls: 'det-w-question' });
      qBox.createEl('div', { text: '📝 Essay Prompt', cls: 'det-w-label' });
      qBox.createEl('div', { text: this.questionData.prompt, cls: 'det-w-prompt' });

      const prepSecs = this.info.prepSeconds;
      const startBtn = this.footerEl.createEl('button', { text: `🧠 준비 시간 시작 (${prepSecs}초)`, cls: 'det-w-btn det-w-btn-primary' });
      const changeBtn = this.footerEl.createEl('button', { text: '🔄 다른 문제', cls: 'det-w-btn' });
      
      startBtn.addEventListener('click', () => this.startPrepPhase(prepSecs));
      changeBtn.addEventListener('click', () => this.regenerateQuestion());
    }
  }

  async regenerateQuestion() {
    this.renderLoading('새로운 문제 가져오는 중...');
    try {
      await this.generateQuestion();
      this.renderQuestion();
    } catch (e) {
      this.renderError(e.message);
    }
  }

  startPrepPhase(seconds) {
    this.phase = 'prep';
    this.startTimer(seconds, '🧠 생각 및 구성 시간 (준비)', 'det-w-timer-prep', () => {
      this.startWritePhase(this.info.answerSeconds);
    });
  }

  startWritePhase(seconds) {
    this.phase = 'write';
    this.clearTimer();
    
    this.bodyEl.empty();
    
    // 상단 문제 노출
    if (this.typeId === 'photo') {
      const qBox = this.bodyEl.createDiv({ cls: 'det-w-question det-w-question-photo' });
      if (this.photoUrl) {
        const wrapper = qBox.createDiv({ cls: 'det-w-photo-wrapper det-w-photo-small' });
        const img = wrapper.createEl('img', { cls: 'det-w-photo' });
        img.src = this.photoUrl;
      }
    } else {
      const qBox = this.bodyEl.createDiv({ cls: 'det-w-question' });
      qBox.createEl('div', { text: this.questionData.prompt, cls: 'det-w-prompt-small' });
    }

    // 에디터 렌더링
    const editArea = this.bodyEl.createDiv({ cls: 'det-w-editor-area' });
    
    if (this.typeId === 'interactive') {
      const phaseInd = editArea.createDiv({ cls: 'det-w-phase-indicator' });
      phaseInd.createDiv({ cls: 'det-w-phase-dot active', attr: { title: '1단계' } });
      phaseInd.createDiv({ cls: 'det-w-phase-dot', attr: { title: '2단계 (Follow-up)' } });
    }

    const textarea = editArea.createEl('textarea', {
      cls: 'det-w-textarea',
      attr: { placeholder: '이곳에 영어로 답안을 작성하세요...' }
    });
    textarea.focus();
    
    // 모바일 터치 가상 키보드 팝업 시 자동 스크롤
    textarea.addEventListener('focus', () => {
      setTimeout(() => { textarea.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    });

    const metaRow = editArea.createDiv({ cls: 'det-w-meta-row' });
    const countBadge = metaRow.createSpan({ cls: 'det-w-word-counter det-w-counter-warn', text: '0 words' });
    
    const updateCount = () => {
      const text = textarea.value.trim();
      const words = text ? text.split(/\s+/).length : 0;
      const chars = text.length;
      countBadge.textContent = `${words} words (${chars} chars)`;
      
      // 권장 단어수 대조 색상 변화 효과
      const target = this.info.targetWords.split('-');
      const minTarget = parseInt(target[0]);
      if (words >= minTarget) {
        countBadge.className = 'det-w-word-counter det-w-counter-success';
      } else {
        countBadge.className = 'det-w-word-counter det-w-counter-warn';
      }
      this.userFirstEssay = text;
    };
    
    textarea.addEventListener('input', updateCount);

    // 타이머 작동
    this.startTimer(seconds, '✍️ 작성 시간 (에세이)', 'det-w-timer-write', () => {
      this.finishWritePhase();
    });
  }

  finishWritePhase() {
    this.clearTimer();
    if (this.typeId === 'interactive') {
      // Interactive Writing: Phase 2 (Follow-up)로 전입
      this.startFollowUpLoading();
    } else {
      this.finishCurrent();
    }
  }

  async startFollowUpLoading() {
    this.phase = 'loading';
    this.renderLoading('작성된 에세이를 바탕으로 후속 질문(Follow-up) 생성 중...');
    
    try {
      const { system, user } = buildFollowUpPrompt(this.questionData.prompt, this.userFirstEssay);
      const q = await callLLM(this.plugin.settings, system, user, { temperature: 0.6 });
      this.followUpQuestionText = (q || '').replace(/"/g, '').trim();
      
      this.startFollowUpPhase();
    } catch (e) {
      console.error(e);
      // 에러 발생 시 fallback 질문 제공해 연습 중단 방지
      this.followUpQuestionText = "Could you explain more about the main reason behind your position?";
      this.startFollowUpPhase();
    }
  }

  startFollowUpPhase() {
    this.phase = 'followUpWrite';
    this.bodyEl.empty();
    
    // 상단 연계 질문 표출
    const qBox = this.bodyEl.createDiv({ cls: 'det-w-question' });
    qBox.createEl('div', { text: `Phase 2: Follow-up Question`, cls: 'det-w-label' });
    qBox.createEl('div', { text: this.followUpQuestionText, cls: 'det-w-prompt' });
    
    const editArea = this.bodyEl.createDiv({ cls: 'det-w-editor-area' });
    
    const phaseInd = editArea.createDiv({ cls: 'det-w-phase-indicator' });
    phaseInd.createDiv({ cls: 'det-w-phase-dot active' });
    phaseInd.createDiv({ cls: 'det-w-phase-dot active' });

    const prevBadge = editArea.createDiv({ cls: 'det-w-prompt-small', attr: { style: 'max-height: 80px; overflow-y: auto; opacity: 0.7; margin-bottom: 8px;' } });
    prevBadge.createEl('strong', { text: '이전 작성글: ' });
    prevBadge.createSpan({ text: this.userFirstEssay });

    const textarea = editArea.createEl('textarea', {
      cls: 'det-w-textarea',
      attr: { placeholder: '후속 질문에 대해 3분간 답변을 추가 작성하세요...' }
    });
    textarea.focus();
    
    textarea.addEventListener('focus', () => {
      setTimeout(() => { textarea.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
    });

    const metaRow = editArea.createDiv({ cls: 'det-w-meta-row' });
    const countBadge = metaRow.createSpan({ cls: 'det-w-word-counter det-w-counter-warn', text: '0 words' });
    
    const updateCount = () => {
      const text = textarea.value.trim();
      const words = text ? text.split(/\s+/).length : 0;
      countBadge.textContent = `${words} words`;
      if (words >= 30) {
        countBadge.className = 'det-w-word-counter det-w-counter-success';
      } else {
        countBadge.className = 'det-w-word-counter det-w-counter-warn';
      }
      this.userSecondEssay = text;
    };
    
    textarea.addEventListener('input', updateCount);

    // 2단계: 3분 타이머 가동 (준비시간 없이 바로 시작)
    this.startTimer(this.info.followUpSeconds, '✍️ 추가 작성 시간 (Follow-up)', 'det-w-timer-write', () => {
      this.finishCurrent();
    });
  }

  startTimer(seconds, label, cssClass, onDone) {
    const existing = this.bodyEl.querySelector('.det-w-timer-area');
    if (existing) existing.remove();
    
    const timerArea = this.bodyEl.createDiv({ cls: `det-w-timer-area ${cssClass}` });
    timerArea.createEl('div', { text: label, cls: 'det-w-phase-label' });
    const display = timerArea.createEl('div', { text: this.fmtTime(seconds), cls: 'det-w-timer-display' });
    
    const barWrap = timerArea.createDiv({ cls: 'det-w-progress' });
    const bar = barWrap.createDiv({ cls: 'det-w-progress-bar' });

    this.footerEl.empty();
    const skipBtn = this.footerEl.createEl('button', {
      text: this.phase === 'prep' ? '⏭ 답변 즉시 시작' : '⏹ 작성 완료 및 제출',
      cls: 'det-w-btn det-w-btn-primary',
    });

    let remaining = seconds;
    const total = seconds;
    const updateBar = () => {
      const pct = ((total - remaining) / total) * 100;
      bar.style.width = `${pct}%`;
    };
    updateBar();

    this.clearTimer();
    this.timerHandle = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this.clearTimer();
        display.textContent = '00:00';
        bar.style.width = '100%';
        onDone();
        return;
      }
      display.textContent = this.fmtTime(remaining);
      updateBar();
      if (remaining <= 10) display.addClass('det-w-timer-warn');
    }, 1000);

    skipBtn.addEventListener('click', () => {
      this.clearTimer();
      onDone();
    });
  }

  fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  async finishCurrent() {
    this.clearTimer();
    this.phase = 'done';
    
    if (!this.plugin.settings.generateModel) {
      this.renderDoneNoModel();
      return;
    }

    this.renderLoading('AI가 당신의 에세이를 첨삭 분석하고 모범 답안을 만드는 중...');
    
    try {
      const followUpParam = this.typeId === 'interactive' 
        ? { question: this.followUpQuestionText, reply: this.userSecondEssay } 
        : null;
        
      const userEssayPayload = this.userFirstEssay || '[No essay content was written by the user]';
      
      const { system, user } = buildFeedbackPrompt(this.typeId, this.questionData, userEssayPayload, followUpParam);
      this.modelText = await callLLM(this.plugin.settings, system, user, { temperature: 0.7, maxTokens: 4096 });

      let savedPath = null;
      if (this.plugin.settings.autoSave) {
        savedPath = await saveSession(
          this.plugin, 
          this.typeId, 
          this.questionData, 
          userEssayPayload, 
          this.modelText, 
          this.photoUrl,
          followUpParam
        );
      }
      this.renderResults(savedPath);
    } catch (e) {
      console.error(e);
      this.renderError(`모범 에세이 첨삭 생성 실패: ${e.message}`);
    }
  }

  renderDoneNoModel() {
    this.bodyEl.empty();
    this.footerEl.empty();
    this.bodyEl.createEl('div', { text: '✅ 에세이 연습 완료!', cls: 'det-w-done-title' });
    this.bodyEl.createEl('div', {
      text: '모범 답안 및 첨삭 생성 기능이 설정에서 꺼져 있습니다.',
      cls: 'det-w-hint',
    });
    
    const close = this.footerEl.createEl('button', { text: '닫기', cls: 'det-w-btn det-w-btn-primary' });
    close.addEventListener('click', () => this.close());
  }

  renderResults(savedPath) {
    this.bodyEl.empty();
    this.footerEl.empty();

    const titleEl = this.bodyEl.createEl('div', { cls: 'det-w-done-title' });
    titleEl.createSpan({ text: '✅ 연습 완료 & AI 피드백' });

    if (savedPath) {
      const saveInfo = this.bodyEl.createDiv({ cls: 'det-w-hint' });
      saveInfo.createEl('span', { text: `💾 저장됨: `, attr: { style: 'font-weight:600;' } });
      saveInfo.createSpan({ text: savedPath });
    }

    // 1. 문제 정보 리캡
    const qRecap = this.bodyEl.createDiv({ cls: 'det-w-result-section' });
    qRecap.createEl('h3', { text: '📝 문제 내용' });
    if (this.typeId === 'photo') {
      if (this.photoUrl) {
        const img = qRecap.createEl('img', { cls: 'det-w-photo det-w-photo-small' });
        img.src = this.photoUrl;
      }
      qRecap.createEl('div', { text: this.questionData.scene_description, cls: 'det-w-prompt-small' });
    } else if (this.typeId === 'interactive') {
      const box = qRecap.createDiv({ cls: 'det-w-prompt-small' });
      box.createEl('div', { text: `[Prompt] ${this.questionData.prompt}`, attr: { style: 'margin-bottom:6px;' } });
      box.createEl('div', { text: `[Follow-up] ${this.followUpQuestionText}`, attr: { style: 'font-style:italic; opacity:0.8;' } });
    } else {
      qRecap.createEl('div', { text: this.questionData.prompt, cls: 'det-w-prompt-small' });
    }

    // 2. 내가 쓴 에세이 리캡
    const myEssaySec = this.bodyEl.createDiv({ cls: 'det-w-result-section' });
    myEssaySec.createEl('h3', { text: '✍️ 작성한 에세이 원본' });
    const essayContentBox = myEssaySec.createDiv({ cls: 'det-w-user-essay-box' });
    
    if (this.typeId === 'interactive') {
      essayContentBox.createEl('div', { text: `[Phase 1 Essay]\n${this.userFirstEssay}`, attr: { style: 'margin-bottom:10px;' } });
      essayContentBox.createEl('div', { text: `[Phase 2 Follow-up Reply]\n${this.userSecondEssay}` });
    } else {
      essayContentBox.textContent = this.userFirstEssay || '(작성된 내용이 없습니다)';
    }

    // 3. AI 에세이 오류 교정 (Corrections Table)
    const correctionsText = parseCorrectionsSection(this.modelText);
    if (correctionsText && !correctionsText.includes('No major errors found')) {
      const corrSec = this.bodyEl.createDiv({ cls: 'det-w-result-section' });
      corrSec.createEl('h3', { text: '🔍 문법 및 어휘 교정 (Corrections)' });
      
      const corrWrap = corrSec.createDiv();
      this.renderMarkdownHTML(corrWrap, correctionsText);
    }

    // 4. AI 모범 답안 (Model Essay)
    const modelSec = this.bodyEl.createDiv({ cls: 'det-w-result-section' });
    modelSec.createEl('h3', { text: '🎯 130점+ 모범 에세이 (Model Essay)' });
    const modelBody = modelSec.createDiv({ cls: 'det-w-model-text' });
    
    const pureModelEssay = parseModelEssaySection(this.modelText).replace(/^##\s+Model Essay/im, '').trim();
    this.renderMarkdownHTML(modelBody, pureModelEssay);

    const copyModelBtn = modelSec.createEl('button', { text: '📋 모범 에세이 전체 복사', cls: 'det-w-btn det-w-btn-small' });
    copyModelBtn.addEventListener('click', () => {
      this.copyToClipboard(pureModelEssay);
    });

    // 5. 유용한 표현 (Useful Expressions) 카드
    const expressions = parseUsefulExpressions(this.modelText);
    if (expressions.length) {
      const exprSec = this.bodyEl.createDiv({ cls: 'det-w-result-section det-w-expr-section' });
      exprSec.createEl('h3', { text: '💎 템플릿 & 유용한 구절 (클릭 복사)' });
      
      const copyAllBtn = exprSec.createEl('button', { text: '📋 영어 표현들만 모두 복사', cls: 'det-w-btn det-w-btn-small' });
      copyAllBtn.addEventListener('click', () => {
        const all = expressions.map(e => e.english).join('\n');
        this.copyToClipboard(all);
      });

      const list = exprSec.createDiv({ cls: 'det-w-expr-list' });
      for (const expr of expressions) {
        const card = list.createDiv({ cls: 'det-w-expr-card' });
        const engRow = card.createDiv({ cls: 'det-w-expr-eng-row' });
        engRow.createSpan({ text: expr.english, cls: 'det-w-expr-eng' });
        
        const copyBtn = engRow.createEl('button', { text: '📋', cls: 'det-w-expr-copy-btn', attr: { title: '클립보드 복사' } });
        copyBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.copyToClipboard(expr.english);
        });
        
        if (expr.korean) {
          card.createDiv({ text: expr.korean, cls: 'det-w-expr-ko' });
        }
        
        card.addEventListener('click', () => this.copyToClipboard(expr.english));
      }
    }

    // 푸터 버튼
    const againBtn = this.footerEl.createEl('button', { text: '🔄 다시 연습하기', cls: 'det-w-btn det-w-btn-primary' });
    const typeBtn = this.footerEl.createEl('button', { text: '🎯 다른 유형 선택', cls: 'det-w-btn' });
    const closeBtn = this.footerEl.createEl('button', { text: '닫기', cls: 'det-w-btn' });

    againBtn.addEventListener('click', () => {
      this.close();
      new PracticeModal(this.app, this.plugin, this.typeId).open();
    });
    typeBtn.addEventListener('click', () => {
      this.close();
      new TypeSelectorModal(this.app, this.plugin).open();
    });
    closeBtn.addEventListener('click', () => this.close());
  }

  renderMarkdownHTML(el, markdownText) {
    if (!markdownText) return;
    
    // 단순 줄바꿈 마크다운 렌더링
    const lines = markdownText.split('\n');
    let isTable = false;
    let tableEl = null;
    let tbodyEl = null;

    const flushTable = () => {
      if (isTable && tableEl) {
        isTable = false;
        tableEl = null;
        tbodyEl = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 마크다운 표 처리
      if (trimmed.startsWith('|')) {
        isTable = true;
        const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
        
        if (trimmed.includes('---')) {
          continue; // 구분선 건너뜀
        }
        
        if (!tableEl) {
          tableEl = el.createEl('table', { cls: 'det-w-corrections-table' });
          const thead = tableEl.createEl('thead');
          const headerRow = thead.createEl('tr');
          cells.forEach(c => headerRow.createEl('th', { text: c }));
          tbodyEl = tableEl.createEl('tbody');
        } else if (tbodyEl) {
          const row = tbodyEl.createEl('tr');
          cells.forEach((c, idx) => {
            const td = row.createEl('td');
            // 원본 텍스트는 빨간색 줄, 교정 텍스트는 초록색 진하게 효과
            if (idx === 0) {
              td.createSpan({ text: c, cls: 'det-w-orig-text' });
            } else if (idx === 1) {
              td.createSpan({ text: c, cls: 'det-w-corr-text' });
            } else {
              td.textContent = c;
            }
          });
        }
        continue;
      }
      
      flushTable();

      if (/^####\s+/.test(trimmed)) {
        el.createEl('h5', { text: trimmed.replace(/^####\s+/, '') });
      } else if (/^###\s+/.test(trimmed)) {
        el.createEl('h4', { text: trimmed.replace(/^###\s+/, '') });
      } else if (/^##\s+/.test(trimmed)) {
        el.createEl('h3', { text: trimmed.replace(/^##\s+/, '') });
      } else if (/^\s*$/.test(trimmed)) {
        // 공백 라인 건너뜀
      } else {
        const p = el.createEl('p');
        p.textContent = trimmed;
      }
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      new Notice('복사되었습니다!');
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        new Notice('복사되었습니다!');
      } catch {
        new Notice('복사 실패: ' + e.message);
      }
    }
  }
}

/* ============================================================
 * Settings Tab
 * ============================================================ */
class DETWritingSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '✍️ DET Writing Practice 설정' });
    containerEl.createEl('p', {
      text: '자동 에세이 피드백과 모범 답안 작성에 사용할 API 제공자를 설정하세요. openai, sonar, gemini, claude 이 4가지를 모두 유연하게 지정할 수 있습니다.',
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName('LLM API 제공자')
      .setDesc('문제 출제 및 에세이 교정/모범 답안 생성에 사용됩니다.')
      .addDropdown(d => d
        .addOption('openai', 'OpenAI (gpt-4o-mini 권장)')
        .addOption('claude', 'Anthropic Claude (haiku 권장)')
        .addOption('gemini', 'Google Gemini (flash-lite 권장)')
        .addOption('sonar', 'Perplexity Sonar')
        .setValue(this.plugin.settings.provider)
        .onChange(async v => {
          this.plugin.settings.provider = v;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: '1. OpenAI 설정' });
    new Setting(containerEl)
      .setName('API 키')
      .addText(t => t
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.openaiApiKey)
        .onChange(async v => { this.plugin.settings.openaiApiKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl)
      .setName('모델 지정')
      .setDesc('토큰 가성비 최적 추천: gpt-4o-mini')
      .addText(t => t
        .setValue(this.plugin.settings.openaiModel)
        .onChange(async v => { this.plugin.settings.openaiModel = v.trim(); await this.plugin.saveSettings(); }));

    containerEl.createEl('h3', { text: '2. Anthropic Claude 설정' });
    new Setting(containerEl)
      .setName('API 키')
      .addText(t => t
        .setPlaceholder('sk-ant-...')
        .setValue(this.plugin.settings.claudeApiKey)
        .onChange(async v => { this.plugin.settings.claudeApiKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl)
      .setName('모델 지정')
      .setDesc('토큰 가성비 최적 추천: claude-3-5-haiku-20241022')
      .addText(t => t
        .setValue(this.plugin.settings.claudeModel)
        .onChange(async v => { this.plugin.settings.claudeModel = v.trim(); await this.plugin.saveSettings(); }));

    containerEl.createEl('h3', { text: '3. Google Gemini 설정' });
    new Setting(containerEl)
      .setName('API 키')
      .addText(t => t
        .setPlaceholder('AIza...')
        .setValue(this.plugin.settings.geminiApiKey)
        .onChange(async v => { this.plugin.settings.geminiApiKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl)
      .setName('모델 지정')
      .setDesc('토큰 가성비 최적 추천: gemini-2.5-flash-lite')
      .addText(t => t
        .setValue(this.plugin.settings.geminiModel)
        .onChange(async v => { this.plugin.settings.geminiModel = v.trim(); await this.plugin.saveSettings(); }));

    containerEl.createEl('h3', { text: '4. Perplexity Sonar 설정 (인터넷 사진 검색)' });
    containerEl.createEl('p', {
      text: '사진 묘사 문제에서 인터넷 실시간 사진 링크를 탐색해 오는 데에도 쓰입니다.',
      cls: 'setting-item-description',
    });
    new Setting(containerEl)
      .setName('API 키')
      .addText(t => t
        .setPlaceholder('pplx-...')
        .setValue(this.plugin.settings.sonarApiKey)
        .onChange(async v => { this.plugin.settings.sonarApiKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl)
      .setName('모델 지정')
      .setDesc('추천: sonar')
      .addText(t => t
        .setValue(this.plugin.settings.sonarModel)
        .onChange(async v => { this.plugin.settings.sonarModel = v.trim(); await this.plugin.saveSettings(); }));

    containerEl.createEl('h3', { text: '저장 및 기능 옵션' });
    new Setting(containerEl)
      .setName('에세이 백업 저장 경로')
      .setDesc('Vault 내부 저장될 최상단 폴더 이름을 정합니다. (유형별로 하위 폴더 자동 생성)')
      .addText(t => t
        .setValue(this.plugin.settings.outputFolder)
        .onChange(async v => { this.plugin.settings.outputFolder = v.trim() || 'DET-Writing-Practice'; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('자동 파일 저장')
      .setDesc('에세이 작성이 완료되고 첨삭이 끝나면 결과를 마크다운 파일로 폴더에 자동 백업합니다.')
      .addToggle(t => t
        .setValue(this.plugin.settings.autoSave)
        .onChange(async v => { this.plugin.settings.autoSave = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('AI 에세이 첨삭 자동 수행')
      .setDesc('에세이 작성이 종료되면 자동으로 AI에 피드백과 모범 답안을 요청합니다. (비활성화 시 에세이 단순 종료)')
      .addToggle(t => t
        .setValue(this.plugin.settings.generateModel)
        .onChange(async v => { this.plugin.settings.generateModel = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName('인터넷 실시간 사진 검색 검색 (Photo 유형)')
      .setDesc('활성화 시 Sonar API 키를 사용해 인터넷에서 매 연습마다 새로운 사진을 탐색합니다. (비활성화 시 엄선된 20개 PET 실생활 프리셋 사진을 랜덤 탑재하여 토큰 비용을 최소화합니다.)')
      .addToggle(t => t
        .setValue(this.plugin.settings.imageSearch)
        .onChange(async v => { this.plugin.settings.imageSearch = v; await this.plugin.saveSettings(); }));
  }
}

/* ============================================================
 * Plugin Entry Point
 * ============================================================ */
class DETWritingPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.recentTopics = new RecentTopics();

    // Obsidian 리본 아이콘에 'pencil' 연필 등록
    this.addRibbonIcon('pencil', 'DET Writing Practice', () => {
      new TypeSelectorModal(this.app, this).open();
    });

    // 명령 팔레트 단축키 명령어 등록
    this.addCommand({
      id: 'det-w-open-selector',
      name: 'DET 라이팅: 유형 선택 열기',
      callback: () => new TypeSelectorModal(this.app, this).open(),
    });
    
    this.addCommand({
      id: 'det-w-practice-photo',
      name: 'DET 라이팅: Write About the Photo 연습 시작',
      callback: () => new PracticeModal(this.app, this, 'photo').open(),
    });
    
    this.addCommand({
      id: 'det-w-practice-interactive',
      name: 'DET 라이팅: Interactive Writing 연습 시작',
      callback: () => new PracticeModal(this.app, this, 'interactive').open(),
    });
    
    this.addCommand({
      id: 'det-w-practice-sample',
      name: 'DET 라이팅: Writing Sample 연습 시작',
      callback: () => new PracticeModal(this.app, this, 'sample').open(),
    });

    // 설정 탭 추가
    this.addSettingTab(new DETWritingSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

module.exports = DETWritingPlugin;
