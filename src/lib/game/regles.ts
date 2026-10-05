import type { Locale } from "@/lib/i18n/dictionaries";
import { QUOTA_VISITE_QUOTIDIEN } from "@/lib/game/visites";

/**
 * Règles du jeu (docs/A-INTEGRER.md §27 C) — v1 : le cœur de boucle
 * (visites, activités et jauges, influence, AntiVille, jumelages). Les
 * autres chapitres (pays et ressources, décisions diplomatiques et
 * guerre, mégaprojets, technologies, monuments) s'ajouteront au rythme
 * des jalons. Contenu FR + EN + ES (DECISIONS.md §1 point 5 ; l'espagnol
 * vient du A-INTEGRER §50 : TypeScript refuse qu'une section n'ait pas sa
 * version dans chaque langue de `locales`).
 *
 * Les chiffres cités doivent rester ceux du serveur (la source de vérité
 * est toujours la base) : le plafond de visites vient de
 * QUOTA_VISITE_QUOTIDIEN, les autres sont recopiés des migrations
 * (influence 5/jour, AntiVille 3/jour, 3 jumelages actifs, fenêtre de 5
 * minutes du choix d'activité) — à relire quand l'un d'eux change.
 * Les effets des jauges (section « Activités et jauges », A-INTEGRER §49)
 * sont ceux des migrations 0024 (effets d'équilibre), 0049 (point fort du
 * Résidentiel) et 0051 (crise de la Recherche).
 */
export interface SectionRegles {
  id: string;
  titre: Record<Locale, string>;
  paragraphes: Record<Locale, string[]>;
}

export const SECTIONS_REGLES: SectionRegles[] = [
  {
    id: "principe",
    titre: { fr: "Le principe", en: "The idea", es: "El principio" },
    paragraphes: {
      fr: [
        "Tu as une ville, dans un pays. Elle grandit grâce aux autres joueurs : chaque fois que quelqu'un la visite, elle gagne des habitants. À toi de visiter les autres villes, de peser sur elles et de faire monter la tienne dans les classements.",
        "Plus ta ville a d'habitants, plus elle débloque de bâtiments, de quartiers et de possibilités.",
      ],
      en: [
        "You have a city, in a country. It grows thanks to other players: every time someone visits it, it gains residents. Visit other cities, weigh in on them and climb the rankings with yours.",
        "The more residents your city has, the more buildings, districts and options it unlocks.",
      ],
      es: [
        "Tienes una ciudad, en un país. Crece gracias a los demás jugadores: cada vez que alguien la visita, gana habitantes. A ti te toca visitar otras ciudades, influir en ellas y subir la tuya en las clasificaciones.",
        "Cuantos más habitantes tiene tu ciudad, más edificios, barrios y posibilidades desbloquea.",
      ],
    },
  },
  {
    id: "visites",
    titre: { fr: "Visiter une ville", en: "Visiting a city", es: "Visitar una ciudad" },
    paragraphes: {
      fr: [
        "Ouvre la page d'une ville : au bout de quelques secondes, la visite est comptée toute seule (« +1 visite »), sans bouton à cliquer. Ta propre ville compte aussi.",
        `Chaque visite apporte en général +1 habitant à la ville visitée. Si son Résidentiel est en crise, le gain peut être nul. Tu peux visiter une même ville ${QUOTA_VISITE_QUOTIDIEN} fois par jour au maximum, avec une heure d'écart entre deux visites.`,
      ],
      en: [
        "Open a city's page: after a few seconds the visit is counted automatically (“+1 visit”), no button to click. Your own city counts too.",
        `Each visit usually brings +1 resident to the visited city. If its Residential is in crisis, the gain may be zero. You can visit the same city at most ${QUOTA_VISITE_QUOTIDIEN} times a day, with an hour between two visits.`,
      ],
      es: [
        "Abre la página de una ciudad: tras unos segundos, la visita se cuenta sola («+1 visita»), sin ningún botón que pulsar. Tu propia ciudad también cuenta.",
        `Cada visita aporta, por lo general, +1 habitante a la ciudad visitada. Si su Residencial está en crisis, la ganancia puede ser nula. Puedes visitar una misma ciudad como máximo ${QUOTA_VISITE_QUOTIDIEN} veces al día, con una hora de diferencia entre dos visitas.`,
      ],
    },
  },
  {
    id: "activites",
    titre: { fr: "Activités et jauges", en: "Activities and gauges", es: "Actividades e indicadores" },
    paragraphes: {
      fr: [
        "Chaque visite est rattachée à une activité (Résidentiel, Loisirs, Commerce, Services, Industrie, Énergie, Recherche — les plus avancées se débloquent avec la taille de la ville). Une activité est tirée au sort ; juste après la visite, tu peux en choisir une autre (le choix est alors définitif pour cette visite, dans les 5 minutes).",
        "Les visites reçues remplissent les jauges de la ville : Crise, Équilibré ou Point fort pour chaque activité. Un point fort donne un avantage (par exemple, plus de chances de gagner un habitant en plus avec le Commerce), une crise un handicap. Le maire peut recommander une activité aux visiteurs.",
        "Deux autres mécaniques utilisent ces mêmes jauges en coulisses : les attaques AntiVille (voir plus bas) et les manifestations, un événement spontané qui peut faire perdre des habitants à une ville où plusieurs activités sont en crise.",
        "🏠 Résidentiel — en crise, une visite a moins de chances de rapporter son habitant ; en point fort, elle a en plus une chance d'en rapporter un de plus.",
        "🏭 Industrie — protège la ville contre la Grève : en point fort, l'effet d'une Grève subie est réduit de moitié ; en crise, il est aggravé d'autant.",
        "🛒 Commerce — en point fort, chaque visite a une chance supplémentaire de rapporter un habitant de plus ; en crise, la ville ne touche plus le bonus quotidien de ses jumelages.",
        "🌳 Loisirs — protège contre la Propagande et limite la perte d'habitants d'une manifestation ; en crise, ces deux effets s'aggravent au lieu de s'atténuer.",
        "🏥 Services — protège la ville contre la Contamination : en point fort, l'effet d'une Contamination subie est réduit de moitié ; en crise, il est aggravé d'autant.",
        "⚡ Énergie — en point fort, réduit le risque qu'une manifestation éclate dans la ville ; en crise, elle pèse plus lourd que les autres activités dans ce même risque.",
        "🔬 Recherche — en point fort, une action d'influence reçue a une chance de rapporter le double ; en crise, aucune nouvelle technologie ne se débloque — rien n'est perdu, les points patientent jusqu'au retour à l'équilibre.",
      ],
      en: [
        "Each visit is tied to an activity (Residential, Leisure, Commerce, Services, Industry, Energy, Research — the more advanced ones unlock as the city grows). One is drawn at random; right after the visit you can pick another (the choice is then final for that visit, within 5 minutes).",
        "Visits received fill the city's gauges: Crisis, Balanced or Strength for each activity. A strength gives an edge (for example, a better chance of an extra resident with Commerce), a crisis a handicap. The mayor can recommend an activity to visitors.",
        "Two other mechanics use these same gauges behind the scenes: AntiCity attacks (see below) and protests — a spontaneous event that can cost a city residents when several of its activities are in crisis.",
        "🏠 Residential — in crisis, a visit is less likely to bring its resident; in strength, it also has a chance of bringing one more.",
        "🏭 Industry — protects the city against Strike: in strength, the effect of a Strike suffered is cut in half; in crisis, it's just as much worse.",
        "🛒 Commerce — in strength, each visit has an extra chance of bringing one more resident; in crisis, the city no longer gets its daily twinning bonus.",
        "🌳 Leisure — protects against Propaganda and limits the residents lost to a protest; in crisis, both effects get worse instead of better.",
        "🏥 Services — protects the city against Contamination: in strength, the effect of a Contamination suffered is cut in half; in crisis, it's just as much worse.",
        "⚡ Energy — in strength, reduces the risk of a protest breaking out in the city; in crisis, it weighs more heavily than other activities in that same risk.",
        "🔬 Research — in strength, an influence action received has a chance of giving double; in crisis, no new technology unlocks — nothing is lost, points simply wait until balance returns.",
      ],
      es: [
        "Cada visita está ligada a una actividad (Residencial, Ocio, Comercio, Servicios, Industria, Energía, Investigación — las más avanzadas se desbloquean con el tamaño de la ciudad). Se sortea una actividad; justo después de la visita puedes elegir otra (la elección es entonces definitiva para esa visita, dentro de los 5 minutos).",
        "Las visitas recibidas llenan los indicadores de la ciudad: Crisis, Equilibrado o Punto fuerte para cada actividad. Un punto fuerte da una ventaja (por ejemplo, más probabilidades de ganar un habitante extra con el Comercio), una crisis un handicap. El alcalde puede recomendar una actividad a los visitantes.",
        "Otras dos mecánicas usan estos mismos indicadores entre bastidores: los ataques AntiCiudad (ver más abajo) y las manifestaciones, un evento espontáneo que puede hacer perder habitantes a una ciudad donde varias actividades están en crisis.",
        "🏠 Residencial — en crisis, una visita tiene menos probabilidades de aportar su habitante; en punto fuerte, tiene además una probabilidad de aportar uno más.",
        "🏭 Industria — protege a la ciudad contra la Huelga: en punto fuerte, el efecto de una Huelga sufrida se reduce a la mitad; en crisis, se agrava en la misma medida.",
        "🛒 Comercio — en punto fuerte, cada visita tiene una probabilidad adicional de aportar un habitante más; en crisis, la ciudad deja de recibir la bonificación diaria de sus hermanamientos.",
        "🌳 Ocio — protege contra la Propaganda y limita la pérdida de habitantes de una manifestación; en crisis, estos dos efectos se agravan en lugar de atenuarse.",
        "🏥 Servicios — protege a la ciudad contra la Contaminación: en punto fuerte, el efecto de una Contaminación sufrida se reduce a la mitad; en crisis, se agrava en la misma medida.",
        "⚡ Energía — en punto fuerte, reduce el riesgo de que estalle una manifestación en la ciudad; en crisis, pesa más que las demás actividades en ese mismo riesgo.",
        "🔬 Investigación — en punto fuerte, una acción de influencia recibida tiene una probabilidad de aportar el doble; en crisis, no se desbloquea ninguna tecnología nueva — no se pierde nada, los puntos esperan hasta que vuelva el equilibrio.",
      ],
    },
  },
  {
    id: "influence",
    titre: { fr: "Influence", en: "Influence", es: "Influencia" },
    paragraphes: {
      fr: [
        "Tu peux influencer la ville d'un autre joueur : elle gagne des points d'influence (jusqu'à 5 actions par jour, quelques secondes d'écart). Une ville en grève ne peut pas être influencée.",
        "Le record d'influence d'une ville débloque, un palier après l'autre, des monuments et des mégaprojets (hôpital, stade, centrales…) : rien à choisir, rien à financer, ils apparaissent tout seuls. Les monuments se dressent dans la ville, les mégaprojets à sa bordure ; « Voir où il est », dans le panneau Monuments et mégaprojets, les retrouve. Les mégaprojets gardent leurs bonus pour toujours (l'hôpital et l'opéra limitent les attaques, le stade les manifestations, les centrales renforcent l'Énergie).",
      ],
      en: [
        "You can influence another player's city: it gains influence points (up to 5 actions a day, a few seconds apart). A city on strike cannot be influenced.",
        "A city's influence record unlocks monuments and megaprojects (hospital, stadium, power plants…), one tier after another: nothing to choose, nothing to fund, they appear on their own. Monuments stand in the city, megaprojects on its edge; “Show me where”, in the Monuments and megaprojects panel, finds them. Megaprojects keep their bonuses for good (the hospital and the opera house limit attacks, the stadium limits protests, the power plants boost Energy).",
      ],
      es: [
        "Puedes influir en la ciudad de otro jugador: gana puntos de influencia (hasta 5 acciones al día, con unos segundos de diferencia). Una ciudad en huelga no puede recibir influencia.",
        "El récord de influencia de una ciudad desbloquea, nivel tras nivel, monumentos y megaproyectos (hospital, estadio, centrales…): nada que elegir, nada que financiar, aparecen solos. Los monumentos se alzan en la ciudad, los megaproyectos en su borde; «Ver dónde está», en el panel Monumentos y megaproyectos, los localiza. Los megaproyectos conservan sus bonificaciones para siempre (el hospital y la ópera limitan los ataques, el estadio las manifestaciones, las centrales refuerzan la Energía).",
      ],
    },
  },
  {
    id: "antiville",
    titre: { fr: "AntiVille", en: "AntiCity", es: "AntiCiudad" },
    paragraphes: {
      fr: [
        "Tu peux aussi nuire à une ville (jusqu'à 3 actions par jour, jamais sur la tienne) : la Grève bloque son influence un temps, la Contamination fait perdre des habitants, la Propagande fait perdre de l'influence.",
        "Chaque attaque a sa parade : l'Industrie protège de la Grève, les Services de la Contamination, les Loisirs de la Propagande. Plus une ville est attaquée dans la journée, plus son état s'aggrave (incidents, troubles, émeutes, crise), mais la solidarité récompense les visiteurs qui l'aident.",
      ],
      en: [
        "You can also hurt a city (up to 3 actions a day, never your own): Strike blocks its influence for a while, Contamination makes it lose residents, Propaganda makes it lose influence.",
        "Each attack has its counter: Industry protects against Strike, Services against Contamination, Leisure against Propaganda. The more a city is attacked in a day, the worse its state gets (incidents, unrest, riots, crisis), but solidarity rewards the visitors who help it.",
      ],
      es: [
        "También puedes perjudicar a una ciudad (hasta 3 acciones al día, nunca la tuya): la Huelga bloquea su influencia durante un tiempo, la Contaminación le hace perder habitantes, la Propaganda le hace perder influencia.",
        "Cada ataque tiene su contramedida: la Industria protege de la Huelga, los Servicios de la Contaminación, el Ocio de la Propaganda. Cuanto más atacada es una ciudad en el día, más empeora su estado (incidentes, alteraciones, disturbios, crisis), pero la solidaridad recompensa a los visitantes que la ayudan.",
      ],
    },
  },
  {
    id: "jumelages",
    titre: { fr: "Jumelages", en: "Twinning", es: "Hermanamientos" },
    paragraphes: {
      fr: [
        "Deux villes peuvent se jumeler (jusqu'à 3 jumelages actifs par ville, avec l'accord de l'autre joueur). Chaque jour où les deux joueurs ont été actifs, les deux villes gagnent un habitant.",
      ],
      en: [
        "Two cities can twin (up to 3 active twinnings per city, with the other player's agreement). Every day both players have been active, both cities gain a resident.",
      ],
      es: [
        "Dos ciudades pueden hermanarse (hasta 3 hermanamientos activos por ciudad, con el acuerdo del otro jugador). Cada día en que ambos jugadores han estado activos, las dos ciudades ganan un habitante.",
      ],
    },
  },
  {
    id: "bientot",
    titre: { fr: "La suite", en: "More to come", es: "Lo que viene" },
    paragraphes: {
      fr: [
        "Les pays et leurs ressources, les décisions diplomatiques et la guerre, les mégaprojets et les technologies existent déjà dans le jeu : leurs règles seront détaillées ici dans une prochaine version.",
      ],
      en: [
        "Countries and their resources, diplomatic decisions and war, megaprojects and technologies already exist in the game: their rules will be detailed here in a later version.",
      ],
      es: [
        "Los países y sus recursos, las decisiones diplomáticas y la guerra, los megaproyectos y las tecnologías ya existen en el juego: sus reglas se detallarán aquí en una próxima versión.",
      ],
    },
  },
];
