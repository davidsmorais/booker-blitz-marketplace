#!/usr/bin/env node
// bbdb — create, update, normalise and check Booker Blitz .bbdb databases.
// Zero dependencies. Mirrors the game's loader (src/types/bbdb.ts) and the
// Wrestler / Promotion shapes in src/types/game.ts.
//
//   node bbdb.mjs new <file.bbdb> --name "Display name" [--start-date 2026-01-01]
//   node bbdb.mjs normalize <file.bbdb> [--dry]
//   node bbdb.mjs check <file.bbdb> [--strict]
//   node bbdb.mjs upsert <file.bbdb> <wrestlers|promotions> <records.json>
//   node bbdb.mjs remove <file.bbdb> <wrestlers|promotions> <id> [id...]
//   node bbdb.mjs stats <file.bbdb>
//   node bbdb.mjs template <wrestler|signed|staff|promotion|show|ppv|title|team>
//   node bbdb.mjs reterm <file.bbdb> [--from-yearly] [--write]
//   node bbdb.mjs rebalance-wages <file.bbdb> [--write]
//   node bbdb.mjs seed-potential <file.bbdb> [--all] [--write]
//
// Wages are monthly. reterm, rebalance-wages and seed-potential are dry runs
// unless --write is passed.

import {readFileSync, writeFileSync, existsSync} from 'node:fs'

// ─── Enums (src/types/game.ts) ──────────────────────────────────────────────

export const ENUMS = {
	base: ['Angola', 'Argentina', 'Australia', 'Austria', 'Belarus', 'Belgium', 'Brazil', 'Canada', 'Celebrity', 'Chile', 'China', 'Croatia', 'Czechia', 'Denmark', 'Egypt', 'Europe', 'France', 'Germany', 'Greece', 'Hungary', 'India', 'Iran', 'Ireland', 'Italy', 'Japan', 'Lithuania', 'Mexico', 'Mongolia', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Other', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Russia', 'Samoa', 'Senegal', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'UAE', 'UK', 'USA'],
	card: ['lower', 'mid', 'upper'],
	prestige: ['low', 'mid', 'high'],
	audience: ['small', 'medium', 'big'],
	momentum: ['frozen', 'low', 'medium', 'hot', 'burning'],
	finisherType: ['strike', 'submission', 'power', 'aerial', 'counter'],
	gender: ['M', 'F', 'O'],
	morale: ['broken', 'poor', 'fair', 'good', 'great', 'excellent'],
	style: ['technical', 'high flyer', 'powerhouse', 'striker', 'submission', 'hardcore', 'all rounder', 'comedy'],
	weightClass: ['super heavyweight', 'heavyweight', 'cruiserweight', 'female', 'hardcore'],
	type: ['wrestler', 'manager', 'commentator', 'interviewer', 'ring_announcer', 'referee', 'writer', 'businessperson', 'medic', 'scout', 'trainer'],
	presentation: ['heel', 'face', 'tweener'],
	regularity: ['single show', 'weekly', 'biweekly', 'monthly'],
	day: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
	month: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
	facility: ['arena', 'gym', 'medical_center', 'production_studio', 'training_facility', 'performance_center'],
	contractType: ['exclusive', 'non-exclusive'],
	contractStatus: ['active', 'expired', 'pending', 'terminated'],
	wageType: ['monthly', 'per-appearance']
}

// ─── Canonical shapes ───────────────────────────────────────────────────────

// The game's new-game setup shifts contract dates by (start date − this base)
const BASE_DATE = '2026-01-01T00:00:00.000Z'

const STAT_KEYS = ['ability', 'currentAbility', 'potentialAbility', 'popularity', 'charisma', 'micSkills', 'condition', 'hardcoreAbility', 'injuryProne']

export const STAFF_ATTRIBUTE_KEYS = ['bookingLogic', 'storytelling', 'productFit', 'riskTaking', 'matchLayout', 'psychology', 'workerManagement', 'trainingIntensity', 'technicalCoaching', 'characterCoaching', 'teaching', 'diagnosis', 'rehabilitation', 'prevention', 'mediaHandling', 'brandBuilding', 'socialMediaSavvy', 'ruleKnowledge', 'positioning', 'reactionSpeed', 'consistency', 'awareness', 'judgement']

// Attributes each staff role is judged on; they default higher than the rest
const ROLE_ATTRIBUTES = {
	businessperson: ['bookingLogic', 'productFit', 'brandBuilding', 'mediaHandling'],
	writer: ['bookingLogic', 'storytelling', 'productFit', 'matchLayout', 'psychology', 'workerManagement'],
	trainer: ['trainingIntensity', 'technicalCoaching', 'characterCoaching', 'teaching'],
	medic: ['diagnosis', 'rehabilitation', 'prevention'],
	referee: ['ruleKnowledge', 'positioning', 'reactionSpeed', 'consistency', 'awareness'],
	scout: ['judgement'],
	commentator: ['mediaHandling', 'brandBuilding', 'socialMediaSavvy'],
	interviewer: ['mediaHandling', 'socialMediaSavvy'],
	ring_announcer: ['mediaHandling'],
	manager: ['mediaHandling', 'socialMediaSavvy', 'psychology']
}

// Singletons are omitted when empty: the game tests `keyStaff.gm !== undefined`
const KEY_STAFF_SINGLE = ['owner', 'gm']
const KEY_STAFF_LISTS = ['booker', 'writers', 'roadAgent', 'commentators', 'interviewer', 'ringAnnouncers', 'referees', 'medicTeam', 'scouts', 'trainers']
const EVENT_STAFF_LISTS = ['writers', 'commentators', 'interviewer', 'ringAnnouncers', 'referees']

const FINISHER_BY_STYLE = {
	technical: 'submission',
	'high flyer': 'aerial',
	powerhouse: 'power',
	striker: 'strike',
	submission: 'submission',
	hardcore: 'power',
	'all rounder': 'power',
	comedy: 'counter'
}

// ─── Wages and contract terms (src/utils/contractEmployment.ts, contractOffers.ts,
// simulationConstants.ts, scripts/rebalance-salaries.ts) ─────────────────────

// Wages are MONTHLY. A per-appearance fee is the monthly figure / 3.25.
const MONTHLY_TO_APPEARANCE_RATIO = 3.25
const APPEARANCES_PER_MONTH = 4
const NON_COMPETE_MAX_FRACTION = 0.2
// AI signing rule: level >= 6 exclusive + monthly; level 4–5 top talent
// non-exclusive + monthly; everyone else non-exclusive + per appearance.
const AI_EXCLUSIVE_MIN_LEVEL = 6
const AI_MONTHLY_MIN_LEVEL = 4
// Top talent: popularity above 1.3× the promotion's roster average
const TOP_TALENT_POPULARITY_RATIO = 1.3
// Asking wage scale used for free agents
const FREE_AGENT_LEVEL = 5

// Missing wageType on a contract = the game's legacy coupling
export const legacyWageType = type => (type === 'exclusive' ? 'monthly' : 'per-appearance')
export const toMonthly = (amount, wageType) => (wageType === 'per-appearance' ? Math.round(amount * MONTHLY_TO_APPEARANCE_RATIO) : amount)
export const fromMonthly = (monthly, wageType) => (wageType === 'per-appearance' ? Math.max(1, Math.round(monthly / MONTHLY_TO_APPEARANCE_RATIO)) : monthly)

export const contractTerms = (level, isTopTalent) => {
	if (level >= AI_EXCLUSIVE_MIN_LEVEL) return {type: 'exclusive', wageType: 'monthly'}
	if (level >= AI_MONTHLY_MIN_LEVEL && isTopTalent) return {type: 'non-exclusive', wageType: 'monthly'}
	return {type: 'non-exclusive', wageType: 'per-appearance'}
}

// [level, upper-card floor, lower-card floor] in $/month, ascending by level.
// Interpolated geometrically between anchors; mid card is the geometric mean.
const WAGE_ANCHORS = [
	[4, 3000, 500],
	[6, 10000, 5000],
	[8, 50000, 10000],
	[10, 100000, 15000]
]
const lerpLog = (a, b, t) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t)
export const wageFloors = level => {
	const first = WAGE_ANCHORS[0]
	const last = WAGE_ANCHORS[WAGE_ANCHORS.length - 1]
	const lvl = Math.min(last[0], Math.max(first[0], level))
	const hi = Math.max(1, WAGE_ANCHORS.findIndex(([l]) => l >= lvl))
	const [loLevel, loUpper, loLower] = WAGE_ANCHORS[hi - 1]
	const [hiLevel, hiUpper, hiLower] = WAGE_ANCHORS[hi]
	const t = (lvl - loLevel) / (hiLevel - loLevel)
	const upper = lerpLog(loUpper, hiUpper, t)
	const lower = lerpLog(loLower, hiLower, t)
	return {upper, mid: Math.sqrt(upper * lower), lower}
}

// Relative pay by role; only the ratio to the wrestler row matters
const ROLE_PAY = {
	wrestler: {upper: 30000, mid: 12000, lower: 4500},
	manager: {upper: 12000, mid: 6000, lower: 2500},
	writer: {upper: 10000, mid: 6000, lower: 3000},
	trainer: {upper: 9000, mid: 5500, lower: 3000},
	commentator: {upper: 10000, mid: 6000, lower: 3000},
	businessperson: {upper: 10000, mid: 6000, lower: 3000},
	interviewer: {upper: 7000, mid: 4000, lower: 2000},
	scout: {upper: 7000, mid: 4000, lower: 2000},
	medic: {upper: 7000, mid: 4500, lower: 2500},
	referee: {upper: 6000, mid: 3500, lower: 1800},
	ring_announcer: {upper: 5000, mid: 3000, lower: 1500}
}
const roundWage = v => Math.max(500, Math.round(v / (v >= 20000 ? 1000 : v >= 5000 ? 500 : 250)) * (v >= 20000 ? 1000 : v >= 5000 ? 500 : 250))

// floor(level, card) × role share × merit (1.0 nobody – 1.5 star; popularity weighs more)
export const suggestMonthlyWage = (w, level) => {
	const card = ENUMS.card.includes(w.cardPosition) ? w.cardPosition : 'lower'
	const role = ROLE_PAY[w.type] ?? ROLE_PAY.referee
	const merit = (0.65 * (w.popularity ?? 30) + 0.35 * (w.currentAbility ?? w.ability ?? 50)) / 100
	return roundWage(wageFloors(level)[card] * (role[card] / ROLE_PAY.wrestler[card]) * (1 + 0.5 * merit))
}

const maxNonCompeteMonths = (startDate, endDate) =>
	Math.max(0, Math.floor(((new Date(endDate) - new Date(startDate)) / (30.44 * 86400000)) * NON_COMPETE_MAX_FRACTION))

// Every wrestler record carries these keys, in this order. promotionId,
// contractExpiryDate and contract are written only for signed talent: the
// game reads `promotionId === undefined` as "free agent", so null is unsafe.
export const WRESTLER_KEYS = ['id', 'name', 'realName', 'nickname', 'type', 'promotionId', 'base', 'gender', 'weight', 'height', 'dateOfBirth', 'debut', 'wage', 'popularity', 'charisma', 'micSkills', 'condition', 'hardcoreAbility', 'injuryProne', 'ability', 'currentAbility', 'potentialAbility', 'morale', 'presentation', 'prestige', 'style', 'cardPosition', 'finisher', 'finisherType', 'character', 'acceptsIndieBookings', 'masked', 'retired', 'dead', 'inDevelopment', 'story', 'alterEgos', 'birthplace', 'managerId', 'contractExpiryDate', 'contract', 'record', 'history', 'teams', 'staffAttributes', 'picture']
const SIGNED_ONLY_KEYS = ['promotionId', 'contractExpiryDate', 'contract']
// Optional game fields a database may carry. Normalize writes wageType for
// signed talent (synced from the contract, as the game does at new game);
// a free agent without one asks a monthly wage.
const OPTIONAL_WRESTLER_KEYS = ['wageType', 'additionalContracts', 'brandShowName']
const WRESTLER_ORDER = WRESTLER_KEYS.flatMap(k => (k === 'wage' ? [k, 'wageType'] : k === 'contract' ? [k, 'additionalContracts'] : [k]))
const CONTRACT_KEYS = ['id', 'wrestlerId', 'promotionId', 'startDate', 'endDate', 'wage', 'wageType', 'type', 'status', 'bookingsPerMonth', 'noCompeteMonths', 'autoRenew', 'injuryGuarantee']

export const PROMOTION_KEYS = ['id', 'fullName', 'shortName', 'base', 'level', 'logo', 'balance', 'momentum', 'audienceSize', 'enforceShowSplit', 'houseShowAttendance', 'houseShowCostLevel', 'houseShowsPerMonth', 'houseShowsPrestige', 'houseShowTicketPrice', 'houseShowRotation', 'keyStaff', 'shows', 'ppvs', 'titles', 'teams', 'storylines', 'tournaments', 'facilities', 'summary', 'externalUrl', 'history']

// Older datapack exports carry these; the game ignores them
const LEGACY_PROMOTION_KEYS = ['brands', 'enforceBrandSplit']

const SHOW_KEYS = ['name', 'logo', 'color', 'day', 'regularity', 'attendance', 'size', 'duration', 'ticketPrice', 'prestige', 'momentum', 'rating', 'lastResults', 'history', 'keyStaff']
const PPV_KEYS = ['name', 'logo', 'date', 'attendance', 'size', 'duration', 'ticketPrice', 'prestige', 'active', 'nextEvent', 'history', 'keyStaff']
const TITLE_KEYS = ['name', 'championName', 'picture', 'card', 'prestige', 'gender', 'weightClass', 'numberOfHolders', 'tournament', 'champion', 'daysHeld', 'defences', 'history']
const TEAM_KEYS = ['id', 'name', 'promotionId', 'memberIds', 'picture', 'prestige', 'popularity', 'dateCreated']

// ─── Helpers ────────────────────────────────────────────────────────────────

const isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const stat = (v, fallback) => (isNum(v) ? clamp(Math.round(v), 0, 100) : fallback)
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback)
const bool = (v, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const arr = v => (Array.isArray(v) ? v : [])
const oneOf = (v, list, fallback) => {
	if (typeof v !== 'string') return fallback
	const hit = list.find(x => x.toLowerCase() === v.trim().toLowerCase())
	return hit ?? fallback
}
const isoDate = (v, fallback) => {
	if (typeof v !== 'string' && !isNum(v)) return fallback
	const d = new Date(v)
	return Number.isNaN(d.getTime()) ? fallback : d.toISOString()
}
const addMonths = (iso, months) => {
	const d = new Date(iso)
	d.setUTCMonth(d.getUTCMonth() + months)
	return d.toISOString()
}
const ordered = (obj, keys) => {
	const out = {}
	for (const k of keys) if (has(obj, k) && obj[k] !== undefined) out[k] = obj[k]
	for (const k of Object.keys(obj)) if (!has(out, k) && obj[k] !== undefined) out[k] = obj[k]
	return out
}

// ─── Wrestlers ──────────────────────────────────────────────────────────────

const defaultStaffAttributes = (type, existing) => {
	const strong = new Set(ROLE_ATTRIBUTES[type] ?? [])
	const base = type === 'wrestler' ? 20 : 40
	const out = {}
	for (const k of STAFF_ATTRIBUTE_KEYS)
		out[k] = stat(existing?.[k], strong.has(k) ? 65 : base)
	return out
}

// Fills one contract. `terms` are used only when the contract states neither
// type nor wageType; a type without a wageType keeps the game's legacy coupling.
const normalizeContract = (c, {w, promotionId, terms, monthlyWage, fallbackEnd}) => {
	const src = isObj(c) ? c : {}
	let type = oneOf(src.type, ENUMS.contractType, undefined)
	let wageType = oneOf(src.wageType, ENUMS.wageType, undefined)
	if (type && !wageType) wageType = legacyWageType(type)
	if (!type) type = terms.type
	if (!wageType) wageType = terms.wageType
	const startDate = isoDate(src.startDate, '2025-07-01T00:00:00.000Z')
	const endDate = isoDate(src.endDate, fallbackEnd)
	const out = {
		...src,
		id: str(src.id) || `contract-bbdb-${w.id}${promotionId === w.promotionId ? '' : `-${promotionId}`}`,
		wrestlerId: w.id,
		promotionId,
		startDate,
		endDate,
		wage: isNum(src.wage) ? Math.round(src.wage) : fromMonthly(monthlyWage, wageType),
		wageType,
		type,
		status: oneOf(src.status, ENUMS.contractStatus, 'active')
	}
	if (wageType === 'per-appearance') {
		out.bookingsPerMonth = isNum(src.bookingsPerMonth) ? src.bookingsPerMonth : APPEARANCES_PER_MONTH
	} else {
		delete out.bookingsPerMonth
		delete out.injuryGuarantee
	}
	if (type === 'exclusive') {
		if (!isNum(out.noCompeteMonths) && isNum(src.noCompeteDays) && src.noCompeteDays > 0) out.noCompeteMonths = Math.round(src.noCompeteDays / 30)
		delete out.noCompeteDays
		if (isNum(out.noCompeteMonths)) out.noCompeteMonths = Math.min(Math.max(0, Math.floor(out.noCompeteMonths)), maxNonCompeteMonths(startDate, endDate))
		if (out.noCompeteMonths === 0) delete out.noCompeteMonths
	} else {
		delete out.noCompeteMonths
		delete out.noCompeteDays
	}
	return ordered(out, CONTRACT_KEYS)
}

// ctx: {promotionIds: Set, levelById: Map, popularityById: Map} built by normalizeDb
export const normalizeWrestler = (w, ctx = {}) => {
	const {promotionIds, levelById = new Map(), popularityById = new Map()} = ctx
	const type = oneOf(w.type, ENUMS.type, 'wrestler')
	const isStaff = type !== 'wrestler'
	const cardPosition = oneOf(w.cardPosition, ENUMS.card, 'lower')
	const style = oneOf(w.style, ENUMS.style, 'all rounder')
	const ability = stat(w.ability, isStaff ? 40 : 50)
	const currentAbility = stat(w.currentAbility, ability)
	const dateOfBirth = isoDate(w.dateOfBirth, '1990-01-01T00:00:00.000Z')
	const debut = isoDate(w.debut, addMonths(dateOfBirth, 20 * 12))

	const out = {
		...w,
		id: w.id,
		name: str(w.name).trim(),
		realName: str(w.realName) || str(w.name).trim(),
		nickname: str(w.nickname),
		type,
		base: oneOf(w.base, ENUMS.base, 'Other'),
		gender: oneOf(w.gender, ENUMS.gender, w.gender),
		weight: isNum(w.weight) ? Math.round(w.weight) : 220,
		height: isNum(w.height) ? Math.round(w.height) : 183,
		dateOfBirth,
		debut,
		wage: isNum(w.wage) ? Math.round(w.wage) : undefined,
		popularity: stat(w.popularity, 30),
		charisma: stat(w.charisma, 50),
		micSkills: stat(w.micSkills, 50),
		condition: stat(w.condition, 100),
		hardcoreAbility: stat(w.hardcoreAbility, 30),
		injuryProne: stat(w.injuryProne, 20),
		ability,
		currentAbility,
		potentialAbility: Math.max(stat(w.potentialAbility, currentAbility), currentAbility),
		morale: oneOf(w.morale, ENUMS.morale, 'fair'),
		presentation: oneOf(w.presentation, ENUMS.presentation, 'face'),
		prestige: oneOf(w.prestige, ENUMS.prestige, 'low'),
		style,
		cardPosition,
		finisher: str(w.finisher),
		finisherType: oneOf(w.finisherType, ENUMS.finisherType, FINISHER_BY_STYLE[style]),
		character: str(w.character),
		acceptsIndieBookings: bool(w.acceptsIndieBookings),
		masked: bool(w.masked),
		retired: bool(w.retired),
		dead: bool(w.dead),
		inDevelopment: bool(w.inDevelopment),
		story: str(w.story),
		alterEgos: arr(w.alterEgos).filter(x => typeof x === 'string'),
		birthplace: str(w.birthplace, 'Unknown') || 'Unknown',
		managerId: isNum(w.managerId) ? w.managerId : 0,
		record: {
			wins: isNum(w.record?.wins) ? w.record.wins : 0,
			losses: isNum(w.record?.losses) ? w.record.losses : 0,
			draws: isNum(w.record?.draws) ? w.record.draws : 0
		},
		history: {
			matches: arr(w.history?.matches),
			jobs: arr(w.history?.jobs),
			titles: arr(w.history?.titles)
		},
		// Recomputed from promotion.teams when a game starts
		teams: arr(w.teams).filter(isNum),
		staffAttributes: defaultStaffAttributes(type, w.staffAttributes),
		picture: str(w.picture)
	}

	// Contract is the source of truth for who a wrestler works for
	const contract = isObj(w.contract) ? w.contract : undefined
	let promotionId = isNum(w.promotionId) ? w.promotionId : undefined
	if (contract && contract.status !== 'terminated' && contract.status !== 'expired' && isNum(contract.promotionId))
		promotionId = contract.promotionId
	if (promotionId !== undefined && promotionIds && !promotionIds.has(promotionId)) promotionId = undefined

	for (const k of SIGNED_ONLY_KEYS) delete out[k]

	// The wrestler's own wage is in wageType units (missing = monthly)
	const ownWageType = oneOf(w.wageType, ENUMS.wageType, undefined)
	const levelOf = id => levelById.get(id) ?? FREE_AGENT_LEVEL
	const isTopAt = id => out.popularity > TOP_TALENT_POPULARITY_RATIO * (popularityById.get(id) ?? levelOf(id) * 10)
	const monthlyAt = id => (isNum(w.wage) ? toMonthly(Math.round(w.wage), ownWageType ?? 'monthly') : suggestMonthlyWage(out, levelOf(id)))
	// Spread expiries so a roster doesn't all hit free agency the same week
	const fallbackEnd = isoDate(w.contractExpiryDate, addMonths(BASE_DATE, 6 + (Number(w.id) % 24)))

	if (promotionId !== undefined) {
		out.promotionId = promotionId
		out.contract = normalizeContract(contract, {w: out, promotionId, terms: contractTerms(levelOf(promotionId), isTopAt(promotionId)), monthlyWage: monthlyAt(promotionId), fallbackEnd})
		out.contractExpiryDate = out.contract.endDate
		// The game syncs these from the contract when a new game starts
		out.wage = out.contract.wage
		out.wageType = out.contract.wageType
	} else {
		out.wage = isNum(w.wage) ? Math.round(w.wage) : fromMonthly(suggestMonthlyWage(out, FREE_AGENT_LEVEL), ownWageType ?? 'monthly')
		if (ownWageType) out.wageType = ownWageType
		else delete out.wageType
	}

	// Extra non-exclusive deals with other promotions
	const extras = arr(w.additionalContracts)
		.filter(c => isObj(c) && isNum(c.promotionId) && c.promotionId !== promotionId && (!promotionIds || promotionIds.has(c.promotionId)))
		.map(c =>
			normalizeContract(c, {
				w: out,
				promotionId: c.promotionId,
				terms: {type: 'non-exclusive', wageType: contractTerms(levelOf(c.promotionId), isTopAt(c.promotionId)).wageType},
				monthlyWage: monthlyAt(c.promotionId),
				fallbackEnd
			})
		)
	if (extras.length) out.additionalContracts = extras
	else delete out.additionalContracts

	return ordered(out, WRESTLER_ORDER)
}

// ─── Promotions ─────────────────────────────────────────────────────────────

const toRef = (ref, byId) => {
	const id = isNum(ref) ? ref : ref?.id
	if (!isNum(id)) return undefined
	const w = byId.get(id)
	return {id, name: w?.name ?? str(ref?.name), pic: w?.picture ?? str(ref?.pic)}
}
const toRefs = (list, byId) => arr(list).map(r => toRef(r, byId)).filter(Boolean)

const normalizeKeyStaff = (ks, byId, lists) => {
	const src = isObj(ks) ? ks : {}
	const out = {}
	for (const k of KEY_STAFF_SINGLE) {
		const ref = toRef(Array.isArray(src[k]) ? src[k][0] : src[k], byId)
		if (ref) out[k] = ref
	}
	for (const k of lists) out[k] = toRefs(src[k], byId)
	// Keep any extra roles the author set on events (booker, medicTeam, ...)
	for (const k of KEY_STAFF_LISTS) if (!has(out, k) && has(src, k)) out[k] = toRefs(src[k], byId)
	return out
}

const normalizeHistory = h => (Array.isArray(h) ? h : [])

const normalizeShow = (s, byId, promo) =>
	ordered(
		{
			...s,
			name: str(s.name, 'Weekly Show'),
			logo: str(s.logo),
			color: str(s.color, '#d10a8f') || '#d10a8f',
			day: oneOf(s.day, ENUMS.day, 'monday'),
			regularity: oneOf(s.regularity, ENUMS.regularity, 'weekly'),
			attendance: oneOf(s.attendance, ENUMS.audience, promo.audienceSize),
			size: oneOf(s.size, ENUMS.audience, promo.audienceSize),
			duration: isNum(s.duration) ? s.duration : 120,
			ticketPrice: isNum(s.ticketPrice) ? s.ticketPrice : 25,
			prestige: oneOf(s.prestige, ENUMS.prestige, 'mid'),
			momentum: oneOf(s.momentum, ENUMS.momentum, promo.momentum),
			rating: isNum(s.rating) ? s.rating : 50,
			lastResults: arr(s.lastResults),
			history: normalizeHistory(s.history),
			keyStaff: normalizeKeyStaff(s.keyStaff, byId, EVENT_STAFF_LISTS)
		},
		SHOW_KEYS
	)

const normalizePpv = (p, byId, promo) =>
	ordered(
		{
			...p,
			name: str(p.name, 'Premium Event'),
			logo: str(p.logo),
			date: oneOf(p.date, ENUMS.month, 'march'),
			attendance: oneOf(p.attendance, ENUMS.audience, promo.audienceSize),
			size: oneOf(p.size, ENUMS.audience, promo.audienceSize),
			duration: isNum(p.duration) ? p.duration : 180,
			ticketPrice: isNum(p.ticketPrice) ? p.ticketPrice : 50,
			prestige: oneOf(p.prestige, ENUMS.prestige, 'mid'),
			active: bool(p.active, true),
			// Recomputed from `date` when a game starts
			nextEvent: isoDate(p.nextEvent, BASE_DATE),
			history: normalizeHistory(p.history),
			keyStaff: normalizeKeyStaff(p.keyStaff, byId, EVENT_STAFF_LISTS)
		},
		PPV_KEYS
	)

const normalizeTitle = (t, byId) => {
	const champion = toRefs(t.champion, byId)
	const holders = isNum(t.numberOfHolders) ? t.numberOfHolders : Math.max(1, champion.length)
	return ordered(
		{
			...t,
			name: str(t.name, 'Championship'),
			championName: str(t.championName),
			picture: str(t.picture),
			card: oneOf(t.card, ENUMS.card, 'mid'),
			prestige: oneOf(t.prestige, ENUMS.prestige, 'mid'),
			gender: oneOf(t.gender, ENUMS.gender, 'M'),
			weightClass: oneOf(t.weightClass, ENUMS.weightClass, t.gender === 'F' ? 'female' : 'heavyweight'),
			numberOfHolders: holders,
			tournament: bool(t.tournament),
			champion,
			daysHeld: isNum(t.daysHeld) ? t.daysHeld : 0,
			defences: isNum(t.defences) ? t.defences : 0,
			history: arr(t.history)
		},
		TITLE_KEYS
	)
}

const normalizeTeam = (t, promoId, i) =>
	ordered(
		{
			...t,
			id: isNum(t.id) ? t.id : i + 1,
			name: str(t.name, `Team ${i + 1}`),
			promotionId: promoId,
			memberIds: arr(t.memberIds).filter(isNum),
			picture: str(t.picture),
			prestige: oneOf(t.prestige, ENUMS.prestige, 'mid'),
			popularity: stat(t.popularity, 50),
			dateCreated: isoDate(t.dateCreated, BASE_DATE)
		},
		TEAM_KEYS
	)

export const normalizePromotion = (p, byId) => {
	const base = {
		audienceSize: oneOf(p.audienceSize, ENUMS.audience, 'small'),
		momentum: oneOf(p.momentum, ENUMS.momentum, 'low')
	}
	const facilities = arr(p.facilities)
		.filter(f => isObj(f) && ENUMS.facility.includes(f.type))
		.map(f => ({type: f.type, level: isNum(f.level) ? clamp(Math.round(f.level), 1, 10) : 1}))
	const out = {
		...p,
		id: p.id,
		fullName: str(p.fullName).trim(),
		shortName: str(p.shortName).trim(),
		base: oneOf(p.base, ENUMS.base, 'Other'),
		level: isNum(p.level) ? clamp(Math.round(p.level), 1, 10) : 1,
		logo: str(p.logo),
		balance: isNum(p.balance) ? p.balance : 100000,
		momentum: base.momentum,
		audienceSize: base.audienceSize,
		enforceShowSplit: bool(p.enforceShowSplit),
		houseShowAttendance: oneOf(p.houseShowAttendance, ENUMS.audience, 'small'),
		houseShowCostLevel: isNum(p.houseShowCostLevel) ? p.houseShowCostLevel : 5000,
		houseShowsPerMonth: isNum(p.houseShowsPerMonth) ? p.houseShowsPerMonth : 4,
		houseShowsPrestige: oneOf(p.houseShowsPrestige, ENUMS.prestige, 'low'),
		houseShowTicketPrice: isNum(p.houseShowTicketPrice) ? p.houseShowTicketPrice : 20,
		houseShowRotation: toRefs(p.houseShowRotation, byId),
		keyStaff: normalizeKeyStaff(p.keyStaff, byId, KEY_STAFF_LISTS),
		shows: arr(p.shows).filter(isObj).map(s => normalizeShow(s, byId, base)),
		ppvs: arr(p.ppvs).filter(isObj).map(x => normalizePpv(x, byId, base)),
		titles: arr(p.titles).filter(isObj).map(t => normalizeTitle(t, byId)),
		teams: arr(p.teams).filter(isObj).map((t, i) => normalizeTeam(t, p.id, i)),
		storylines: arr(p.storylines),
		tournaments: arr(p.tournaments),
		facilities: facilities.length > 0 ? facilities : [{type: 'arena', level: 1}],
		summary: str(p.summary),
		externalUrl: str(p.externalUrl),
		history: {
			events: arr(p.history?.events),
			monthlyBalance: arr(p.history?.monthlyBalance),
			monthlyMomentum: arr(p.history?.monthlyMomentum),
			departures: arr(p.history?.departures),
			arrivals: arr(p.history?.arrivals)
		}
	}
	return ordered(out, PROMOTION_KEYS)
}

// ─── Database ───────────────────────────────────────────────────────────────

// The game no longer reads contracts.json. Rows for workers with no embedded
// contract become wrestler.contract (earliest start) + additionalContracts;
// embedded contracts always win. Mutates the (already copied) wrestlers.
export const embedStandaloneContracts = (wrestlers, contracts) => {
	const byId = new Map(wrestlers.map(w => [w.id, w]))
	const byWrestler = new Map()
	for (const c of contracts.filter(isObj)) byWrestler.set(c.wrestlerId, [...(byWrestler.get(c.wrestlerId) ?? []), c])
	let embedded = 0
	for (const [id, rows] of byWrestler) {
		const w = byId.get(id)
		if (!w || w.retired || isObj(w.contract) || arr(w.additionalContracts).length) continue
		const [first, ...rest] = [...rows].sort((a, b) => (String(a.startDate) < String(b.startDate) ? -1 : 1))
		w.contract = {...first}
		w.promotionId = first.promotionId
		w.wage = first.wage
		w.contractExpiryDate = first.endDate
		if (rest.length) w.additionalContracts = rest.map(r => ({...r}))
		embedded++
	}
	return embedded
}

// Roster-average popularity per promotion, as getPromotionPopularity in the game
const rosterPopularity = (promotions, wrestlers) => {
	const out = new Map()
	for (const p of promotions) {
		const roster = wrestlers.filter(w => (w.contract?.promotionId ?? w.promotionId) === p.id && !w.retired && !w.dead)
		out.set(p.id, roster.length ? Math.round(roster.reduce((s, w) => s + (isNum(w.popularity) ? w.popularity : 30), 0) / roster.length) : clamp((p.level ?? 1) * 10, 1, 100))
	}
	return out
}

export const normalizeDb = db => {
	const files = isObj(db.files) ? db.files : {}
	const promotionsIn = arr(files['promotions.json']).filter(isObj)
	const wrestlersIn = arr(files['wrestlers.json']).filter(isObj).map(w => ({...w}))
	embedStandaloneContracts(wrestlersIn, arr(files['contracts.json']))
	const promotionIds = new Set(promotionsIn.map(p => p.id).filter(isNum))
	const ctx = {
		promotionIds,
		levelById: new Map(promotionsIn.map(p => [p.id, isNum(p.level) ? clamp(Math.round(p.level), 1, 10) : 1])),
		popularityById: rosterPopularity(promotionsIn, wrestlersIn)
	}

	const wrestlers = wrestlersIn.map(w => normalizeWrestler(w, ctx))
	const byId = new Map(wrestlers.map(w => [w.id, w]))
	const promotions = promotionsIn.map(p => normalizePromotion(p, byId))

	const saveMeta = isObj(files['save_meta.json']) ? files['save_meta.json'] : {}
	const nextFiles = {
		...files,
		'promotions.json': promotions,
		'wrestlers.json': wrestlers,
		'save_meta.json': {
			...saveMeta,
			startDate: str(saveMeta.startDate, '2026-01-01') || '2026-01-01',
			imgPath: str(saveMeta.imgPath),
			themeKey: str(saveMeta.themeKey)
		}
	}
	// Embedded above; the game ignores the standalone file
	delete nextFiles['contracts.json']
	return {
		format: 'bbdb',
		version: 1,
		name: str(db.name).trim(),
		exportedAt: isoDate(db.exportedAt, new Date().toISOString()),
		files: ordered(nextFiles, ['promotions.json', 'wrestlers.json', 'arenas.json', 'alliances.json', 'save_meta.json', 'datapack.json'])
	}
}

const ARRAY_FILES = ['wrestlers.json', 'promotions.json', 'contracts.json', 'arenas.json', 'alliances.json']
const OBJECT_FILES = ['save_meta.json', 'datapack.json']

export const checkDb = (db, {strict = false} = {}) => {
	const errors = []
	const warnings = []
	const err = (where, msg) => errors.push(`${where}: ${msg}`)
	const warn = (where, msg) => warnings.push(`${where}: ${msg}`)

	// Envelope — mirrors validateBbDbFile in the game
	if (!isObj(db)) return {errors: ['file: must be a JSON object'], warnings}
	if (db.format !== 'bbdb') err('envelope', 'format must be "bbdb"')
	if (db.version !== 1) err('envelope', 'version must be 1')
	if (typeof db.name !== 'string' || !db.name.trim()) err('envelope', 'name must be a non-empty string')
	for (const k of Object.keys(db)) if (!['format', 'version', 'name', 'exportedAt', 'files'].includes(k)) err('envelope', `unknown top-level key "${k}"`)
	if (!isObj(db.files)) return {errors: [...errors, 'envelope: files must be an object'], warnings}
	for (const [k, v] of Object.entries(db.files)) {
		if (ARRAY_FILES.includes(k)) {
			if (!Array.isArray(v)) err(k, 'must be an array')
		} else if (OBJECT_FILES.includes(k)) {
			if (!isObj(v)) err(k, 'must be an object')
		} else err('files', `unknown file "${k}" (the game drops it)`)
	}
	if (!db.files['wrestlers.json'] && !db.files['promotions.json']) err('files', 'needs wrestlers.json or promotions.json')
	if (JSON.stringify(db).includes('data:image/')) err('file', 'embedded data:image/ found — images must be filenames')

	const wrestlers = arr(db.files['wrestlers.json'])
	const promotions = arr(db.files['promotions.json'])
	const byId = new Map()
	const promoById = new Map()

	for (const p of promotions) {
		if (!isNum(p.id)) err('promotion', `non-numeric id ${JSON.stringify(p.id)}`)
		else if (promoById.has(p.id)) err(`promotion ${p.id}`, 'duplicate id')
		else promoById.set(p.id, p)
	}
	for (const w of wrestlers) {
		if (!isNum(w.id)) err('wrestler', `non-numeric id ${JSON.stringify(w.id)} (${w.name})`)
		else if (byId.has(w.id)) err(`wrestler ${w.id}`, `duplicate id (${w.name})`)
		else byId.set(w.id, w)
	}

	const enumCheck = (where, obj, key, list) => {
		if (!list.includes(obj[key])) err(where, `${key} ${JSON.stringify(obj[key])} is not one of: ${list.join(', ')}`)
	}
	const missing = (where, obj, keys) => {
		const gone = keys.filter(k => !has(obj, k))
		if (gone.length) err(where, `missing ${gone.join(', ')} — run normalize`)
	}
	const isDate = v => typeof v === 'string' && !Number.isNaN(new Date(v).getTime())
	const startYear = new Date(`${str(db.files['save_meta.json']?.startDate, '2026-01-01') || '2026-01-01'}T00:00:00Z`).getUTCFullYear()

	// Contract terms. Missing wageType and over-scale wages are summarised per
	// promotion below rather than once per worker.
	const noWageType = []
	const overScale = new Map()
	const contractChecks = (at, w, c) => {
		if (!has(c, 'wageType')) noWageType.push(c)
		if (c.type !== 'exclusive' && isNum(c.noCompeteMonths) && c.noCompeteMonths > 0) warn(at, 'noCompeteMonths on a non-exclusive deal (ignored by the game)')
		if (c.type === 'exclusive' && isNum(c.noCompeteMonths) && isDate(c.startDate) && isDate(c.endDate) && c.noCompeteMonths > maxNonCompeteMonths(c.startDate, c.endDate))
			warn(at, `noCompeteMonths ${c.noCompeteMonths} is over 20% of the term (${maxNonCompeteMonths(c.startDate, c.endDate)} max)`)
		const level = promoById.get(c.promotionId)?.level
		if (!isNum(c.wage) || !isNum(level)) return
		const monthly = toMonthly(c.wage, c.wageType ?? legacyWageType(c.type))
		// 4× what a 100-popularity star earns at this level and card
		const ceiling = 4 * suggestMonthlyWage({...w, popularity: 100, currentAbility: 100}, level)
		if (monthly > ceiling) overScale.set(c.promotionId, [...(overScale.get(c.promotionId) ?? []), `${w.name} $${monthly.toLocaleString('en-US')}`])
	}

	// Wrestlers
	for (const w of wrestlers) {
		const at = `wrestler ${w.id} (${w.name ?? '?'})`
		missing(at, w, WRESTLER_KEYS.filter(k => !SIGNED_ONLY_KEYS.includes(k)))
		if (typeof w.name !== 'string' || !w.name.trim()) err(at, 'name is empty')
		enumCheck(at, w, 'type', ENUMS.type)
		enumCheck(at, w, 'base', ENUMS.base)
		enumCheck(at, w, 'gender', ENUMS.gender)
		enumCheck(at, w, 'morale', ENUMS.morale)
		enumCheck(at, w, 'presentation', ENUMS.presentation)
		enumCheck(at, w, 'prestige', ENUMS.prestige)
		enumCheck(at, w, 'style', ENUMS.style)
		enumCheck(at, w, 'cardPosition', ENUMS.card)
		enumCheck(at, w, 'finisherType', ENUMS.finisherType)
		for (const k of STAT_KEYS) if (!isNum(w[k]) || w[k] < 0 || w[k] > 100) err(at, `${k} must be a number 0–100`)
		if (isNum(w.potentialAbility) && isNum(w.currentAbility) && w.potentialAbility < w.currentAbility) err(at, 'potentialAbility below currentAbility')
		for (const k of ['dateOfBirth', 'debut']) if (!isDate(w[k])) err(at, `${k} is not an ISO date`)
		if (isDate(w.dateOfBirth) && isDate(w.debut)) {
			const born = new Date(w.dateOfBirth).getUTCFullYear()
			const debut = new Date(w.debut).getUTCFullYear()
			const age = startYear - born
			if (debut < born) warn(at, 'debut is before dateOfBirth')
			if (age < 16 || age > 80) warn(at, `age ${age} at game start (${startYear}) — ages drive retirement and decline`)
		}
		if (isNum(w.weight) && (w.weight < 90 || w.weight > 700)) warn(at, `weight ${w.weight} — the game uses lbs`)
		if (isNum(w.height) && (w.height < 120 || w.height > 240)) warn(at, `height ${w.height} — the game uses cm`)
		if (typeof w.picture === 'string' && /^(https?:|data:)|[\\/]/.test(w.picture)) err(at, 'picture must be a bare filename')
		if (w.type === 'wrestler' && !w.finisher) warn(at, 'no finisher name')
		if (!w.story) warn(at, 'story is empty')
		if (w.managerId && !byId.has(w.managerId)) err(at, `managerId ${w.managerId} does not exist`)
		if (has(w, 'promotionId')) {
			if (w.promotionId === null || !isNum(w.promotionId)) err(at, 'promotionId must be a number or omitted (null reads as signed)')
			else if (!promoById.has(w.promotionId)) err(at, `promotionId ${w.promotionId} does not exist`)
			if (!isObj(w.contract)) err(at, 'signed but has no contract — run normalize')
		}
		if (isObj(w.contract)) {
			const c = w.contract
			if (c.wrestlerId !== w.id) err(at, `contract.wrestlerId ${c.wrestlerId} ≠ id`)
			if (c.status === 'active' && c.promotionId !== w.promotionId) err(at, 'contract.promotionId ≠ promotionId')
			enumCheck(at, c, 'type', ENUMS.contractType)
			enumCheck(at, c, 'status', ENUMS.contractStatus)
			if (has(c, 'wageType')) enumCheck(at, c, 'wageType', ENUMS.wageType)
			if (!isDate(c.startDate) || !isDate(c.endDate)) err(at, 'contract dates must be ISO dates')
			contractChecks(at, w, c)
		}
		if (has(w, 'wageType')) enumCheck(at, w, 'wageType', ENUMS.wageType)
		if (has(w, 'additionalContracts')) {
			if (!Array.isArray(w.additionalContracts)) err(at, 'additionalContracts must be an array')
			else for (const c of w.additionalContracts) {
				if (!isObj(c)) { err(at, 'additionalContracts entries must be objects'); continue }
				if (c.wrestlerId !== w.id) err(at, `additionalContracts wrestlerId ${c.wrestlerId} ≠ id`)
				if (c.type !== 'non-exclusive') err(at, 'additionalContracts must be non-exclusive')
				if (has(c, 'wageType')) enumCheck(at, c, 'wageType', ENUMS.wageType)
				if (!isDate(c.startDate) || !isDate(c.endDate)) err(at, 'additionalContracts dates must be ISO dates')
				if (!promoById.has(c.promotionId)) err(at, `additionalContracts promotionId ${c.promotionId} does not exist`)
				else if (c.promotionId === w.promotionId) err(at, 'additionalContracts repeats the primary contract\'s promotion')
				contractChecks(at, w, c)
			}
			if (w.additionalContracts.length && w.contract?.type === 'exclusive' && w.contract?.status === 'active')
				err(at, 'exclusive contract plus additionalContracts — exclusive talent works for one company')
			if (w.additionalContracts.length && !isObj(w.contract)) warn(at, 'additionalContracts but no primary contract')
		}
		if (!isObj(w.staffAttributes)) err(at, 'staffAttributes missing')
		else {
			const gone = STAFF_ATTRIBUTE_KEYS.filter(k => !isNum(w.staffAttributes[k]))
			if (gone.length) err(at, `staffAttributes missing ${gone.join(', ')}`)
		}
		for (const k of Object.keys(w)) if (!WRESTLER_KEYS.includes(k) && !OPTIONAL_WRESTLER_KEYS.includes(k)) warn(at, `unknown field "${k}"`)
	}

	// Promotions
	const refCheck = (at, role, ref, promoId) => {
		if (!isObj(ref) || !isNum(ref.id)) return err(at, `${role} entry is not {id, name, pic}`)
		const w = byId.get(ref.id)
		if (!w) return err(at, `${role} references missing wrestler ${ref.id}`)
		if (ref.name !== w.name) warn(at, `${role} ${ref.id} name "${ref.name}" ≠ "${w.name}" — run normalize`)
		if (promoId !== undefined && w.promotionId !== promoId) warn(at, `${role} ${w.name} is not signed here`)
	}
	const keyStaffCheck = (at, ks, promoId, lists) => {
		if (!isObj(ks)) return err(at, 'keyStaff must be an object')
		for (const k of KEY_STAFF_SINGLE) {
			if (!has(ks, k)) continue
			if (ks[k] === null) err(at, `keyStaff.${k} is null — omit it instead`)
			else refCheck(at, k, ks[k], promoId)
		}
		for (const k of lists) if (!Array.isArray(ks[k])) err(at, `keyStaff.${k} must be an array`)
		for (const k of KEY_STAFF_LISTS) for (const r of arr(ks[k])) refCheck(at, k, r, promoId)
	}

	for (const p of promotions) {
		const at = `promotion ${p.id} (${p.shortName ?? p.fullName ?? '?'})`
		missing(at, p, PROMOTION_KEYS)
		if (!p.fullName) err(at, 'fullName is empty')
		if (!p.shortName) err(at, 'shortName is empty')
		enumCheck(at, p, 'base', ENUMS.base)
		enumCheck(at, p, 'momentum', ENUMS.momentum)
		enumCheck(at, p, 'audienceSize', ENUMS.audience)
		enumCheck(at, p, 'houseShowAttendance', ENUMS.audience)
		enumCheck(at, p, 'houseShowsPrestige', ENUMS.prestige)
		if (!isNum(p.level) || p.level < 1 || p.level > 10) err(at, 'level must be 1–10')
		for (const k of ['shows', 'ppvs', 'titles', 'teams', 'storylines', 'tournaments', 'houseShowRotation']) if (!Array.isArray(p[k])) err(at, `${k} must be an array (the game maps over it)`)
		keyStaffCheck(at, p.keyStaff, p.id, KEY_STAFF_LISTS)
		for (const s of arr(p.shows)) {
			const sat = `${at} show "${s.name}"`
			missing(sat, s, SHOW_KEYS)
			enumCheck(sat, s, 'day', ENUMS.day)
			enumCheck(sat, s, 'regularity', ENUMS.regularity)
			enumCheck(sat, s, 'size', ENUMS.audience)
			enumCheck(sat, s, 'attendance', ENUMS.audience)
			enumCheck(sat, s, 'prestige', ENUMS.prestige)
			keyStaffCheck(sat, s.keyStaff, undefined, EVENT_STAFF_LISTS)
		}
		for (const e of arr(p.ppvs)) {
			const eat = `${at} ppv "${e.name}"`
			missing(eat, e, PPV_KEYS)
			enumCheck(eat, e, 'date', ENUMS.month)
			enumCheck(eat, e, 'size', ENUMS.audience)
			enumCheck(eat, e, 'attendance', ENUMS.audience)
			enumCheck(eat, e, 'prestige', ENUMS.prestige)
			keyStaffCheck(eat, e.keyStaff, undefined, EVENT_STAFF_LISTS)
		}
		for (const t of arr(p.titles)) {
			const tat = `${at} title "${t.name}"`
			missing(tat, t, TITLE_KEYS)
			enumCheck(tat, t, 'card', ENUMS.card)
			enumCheck(tat, t, 'prestige', ENUMS.prestige)
			enumCheck(tat, t, 'gender', ENUMS.gender)
			enumCheck(tat, t, 'weightClass', ENUMS.weightClass)
			for (const r of arr(t.champion)) {
				const w = byId.get(r?.id)
				if (!w) err(tat, `champion ${r?.id} does not exist`)
				else if (w.promotionId !== p.id) warn(tat, `champion ${w.name} is not signed here`)
			}
			if (t.champion?.length && t.champion.length !== t.numberOfHolders) warn(tat, `${t.champion.length} champions but numberOfHolders ${t.numberOfHolders}`)
		}
		const teamIds = new Set()
		for (const t of arr(p.teams)) {
			const tat = `${at} team "${t.name}"`
			missing(tat, t, TEAM_KEYS)
			if (teamIds.has(t.id)) err(tat, `duplicate team id ${t.id}`)
			teamIds.add(t.id)
			for (const id of arr(t.memberIds)) {
				const w = byId.get(id)
				if (!w) err(tat, `member ${id} does not exist`)
				else if (w.promotionId !== p.id) warn(tat, `member ${w.name} is not signed here (the game drops them)`)
			}
			if (arr(t.memberIds).length < 2) warn(tat, 'fewer than 2 members (the game drops it)')
		}
		for (const k of Object.keys(p)) if (!PROMOTION_KEYS.includes(k) && !LEGACY_PROMOTION_KEYS.includes(k)) warn(at, `unknown field "${k}"`)

		const roster = wrestlers.filter(w => w.promotionId === p.id)
		const count = type => roster.filter(w => w.type === type).length
		if (!arr(p.shows).length) warn(at, 'no weekly shows')
		if (!arr(p.titles).length) warn(at, 'no titles')
		if (count('wrestler') < 8) warn(at, `only ${count('wrestler')} signed wrestlers`)
		for (const type of ['referee', 'commentator', 'writer', 'businessperson'])
			if (!count(type)) warn(at, `no signed ${type} — the game fills keyStaff from the roster`)
	}

	// Contract terms
	if (noWageType.length) {
		const nonExclusive = noWageType.filter(c => c.type !== 'exclusive').length
		warn('contracts', `${noWageType.length} contract(s) have no wageType — the game pays exclusive monthly and non-exclusive per appearance (${nonExclusive} per-appearance). Run normalize to write it explicitly, or reterm to re-term by promotion size`)
	}
	for (const [id, list] of overScale)
		warn(`promotion ${id} (${promoById.get(id)?.shortName ?? '?'})`, `${list.length} wage(s) over 4× the level-${promoById.get(id)?.level} scale, e.g. ${list.slice(0, 3).join(', ')}/month. Wages are monthly — yearly figures need /12 (reterm --from-yearly) or run rebalance-wages`)

	// Side files: the game no longer reads contracts.json (wrestler.contract is
	// the source of truth); normalize embeds its rows and drops it
	const contracts = arr(db.files['contracts.json'])
	if (has(db.files, 'contracts.json'))
		warn('contracts.json', `${contracts.length} standalone contract(s) the game ignores — run normalize to embed them on the wrestlers and drop the file`)
	const imgPath = db.files['save_meta.json']?.imgPath
	if (typeof imgPath === 'string' && /^(\/|[A-Za-z]:[\\/]|~)/.test(imgPath))
		warn('save_meta.json', `imgPath "${imgPath}" is a local path — clear it before sharing`)

	if (strict) {
		errors.push(...warnings.map(w => `(strict) ${w}`))
		warnings.length = 0
	}
	return {errors, warnings}
}

// ─── Templates ──────────────────────────────────────────────────────────────

const TEMPLATES = {
	wrestler: () => normalizeWrestler({id: 1, name: 'New Wrestler', gender: 'M'}),
	// Signed to a level-6 promotion: exclusive, monthly
	signed: () => normalizeWrestler({id: 1, name: 'Signed Wrestler', gender: 'M', promotionId: 1, cardPosition: 'mid', popularity: 55}, {promotionIds: new Set([1]), levelById: new Map([[1, 6]])}),
	staff: () => normalizeWrestler({id: 1, name: 'New Referee', gender: 'F', type: 'referee'}),
	promotion: () => normalizePromotion({id: 1, fullName: 'New Promotion', shortName: 'NEW'}, new Map()),
	show: () => normalizeShow({name: 'Weekly Show'}, new Map(), {audienceSize: 'small', momentum: 'low'}),
	ppv: () => normalizePpv({name: 'Premium Event'}, new Map(), {audienceSize: 'small', momentum: 'low'}),
	title: () => normalizeTitle({name: 'World Championship', card: 'upper'}, new Map()),
	team: () => normalizeTeam({name: 'New Team', memberIds: []}, 1, 0)
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const read = file => {
	if (!existsSync(file)) die(`No such file: ${file}`)
	try {
		return JSON.parse(readFileSync(file, 'utf8'))
	} catch (e) {
		die(`${file} is not valid JSON: ${e.message}`)
	}
}
const write = (file, db) => writeFileSync(file, `${JSON.stringify(db, null, 2)}\n`)
const die = msg => {
	console.error(msg)
	process.exit(1)
}
const flag = (args, name) => {
	const i = args.indexOf(name)
	return i >= 0 ? args[i + 1] : undefined
}
const collection = kind => {
	if (kind === 'wrestlers' || kind === 'promotions') return `${kind}.json`
	die('Collection must be "wrestlers" or "promotions"')
}

const report = (file, db, opts) => {
	const {errors, warnings} = checkDb(db, opts)
	for (const w of warnings) console.log(`warn  ${w}`)
	for (const e of errors) console.log(`ERROR ${e}`)
	const size = Buffer.byteLength(JSON.stringify(db))
	if (size > 16 * 1024 * 1024) errors.push('file is over 16 MB')
	console.log(`\n${file}: ${errors.length} error(s), ${warnings.length} warning(s)`)
	return errors.length === 0
}

const commands = {
	new(args) {
		const [file] = args
		const name = flag(args, '--name')
		if (!file || !name) die('Usage: new <file.bbdb> --name "Display name" [--start-date YYYY-MM-DD]')
		if (existsSync(file)) die(`${file} already exists`)
		const db = normalizeDb({
			name,
			exportedAt: new Date().toISOString(),
			files: {
				'promotions.json': [],
				'wrestlers.json': [],
				'save_meta.json': {startDate: flag(args, '--start-date') ?? '2026-01-01'}
			}
		})
		write(file, db)
		console.log(`Created ${file}`)
	},

	normalize(args) {
		const [file] = args
		if (!file) die('Usage: normalize <file.bbdb> [--dry]')
		const before = read(file)
		const after = normalizeDb(before)
		const changed = JSON.stringify(before) !== JSON.stringify(after)
		if (args.includes('--dry')) {
			console.log(changed ? 'normalize would change the file' : 'already normalized')
			return
		}
		if (changed) write(file, after)
		console.log(changed ? `Normalized ${file}` : `${file} already normalized`)
		report(file, after)
	},

	check(args) {
		const [file] = args
		if (!file) die('Usage: check <file.bbdb> [--strict]')
		if (!report(file, read(file), {strict: args.includes('--strict')})) process.exit(1)
	},

	upsert(args) {
		const [file, kind, recordsFile] = args
		if (!file || !kind || !recordsFile) die('Usage: upsert <file.bbdb> <wrestlers|promotions> <records.json>')
		const key = collection(kind)
		const db = read(file)
		const incoming = read(recordsFile)
		const records = Array.isArray(incoming) ? incoming : [incoming]
		const list = arr(db.files[key])
		let nextId = list.reduce((m, r) => Math.max(m, isNum(r.id) ? r.id : 0), 0) + 1
		let added = 0
		let updated = 0
		for (const rec of records) {
			if (!isObj(rec)) continue
			const i = isNum(rec.id) ? list.findIndex(r => r.id === rec.id) : -1
			if (i < 0) {
				list.push({...rec, id: isNum(rec.id) ? rec.id : nextId++})
				if (isNum(rec.id)) nextId = Math.max(nextId, rec.id + 1)
				added++
				continue
			}
			// One level deep: nested objects merge, arrays and scalars replace
			const merged = {...list[i]}
			for (const [k, v] of Object.entries(rec)) {
				if (v === null && SIGNED_ONLY_KEYS.includes(k)) delete merged[k]
				else merged[k] = isObj(v) && isObj(merged[k]) ? {...merged[k], ...v} : v
			}
			// Releasing talent: dropping promotionId also drops the contract
			if (key === 'wrestlers.json' && has(rec, 'promotionId') && rec.promotionId === null) {
				delete merged.contract
				delete merged.contractExpiryDate
			}
			if (key === 'wrestlers.json' && isNum(rec.promotionId) && merged.contract?.promotionId !== rec.promotionId) {
				delete merged.contract
				delete merged.contractExpiryDate
			}
			list[i] = merged
			updated++
		}
		db.files[key] = list
		const out = normalizeDb(db)
		write(file, out)
		console.log(`${kind}: ${added} added, ${updated} updated`)
		report(file, out)
	},

	remove(args) {
		const [file, kind, ...rawIds] = args
		const ids = new Set(rawIds.map(Number).filter(Number.isFinite))
		if (!file || !kind || !ids.size) die('Usage: remove <file.bbdb> <wrestlers|promotions> <id> [id...]')
		const key = collection(kind)
		const db = read(file)
		const before = arr(db.files[key]).length
		db.files[key] = arr(db.files[key]).filter(r => !ids.has(r.id))
		if (key === 'promotions.json') {
			// Talent of a removed promotion becomes free agents
			for (const w of arr(db.files['wrestlers.json'])) {
				if (ids.has(w.promotionId) || ids.has(w.contract?.promotionId)) {
					delete w.promotionId
					delete w.contract
					delete w.contractExpiryDate
				}
			}
		} else {
			const keep = r => !ids.has(isNum(r) ? r : r?.id)
			for (const w of arr(db.files['wrestlers.json'])) if (ids.has(w.managerId)) w.managerId = 0
			for (const p of arr(db.files['promotions.json'])) {
				const scrub = ks => {
					if (!isObj(ks)) return
					for (const k of KEY_STAFF_SINGLE) if (ks[k] && !keep(ks[k])) delete ks[k]
					for (const k of KEY_STAFF_LISTS) if (Array.isArray(ks[k])) ks[k] = ks[k].filter(keep)
				}
				scrub(p.keyStaff)
				for (const e of [...arr(p.shows), ...arr(p.ppvs)]) scrub(e.keyStaff)
				p.houseShowRotation = arr(p.houseShowRotation).filter(keep)
				for (const t of arr(p.titles)) t.champion = arr(t.champion).filter(keep)
				for (const t of arr(p.teams)) t.memberIds = arr(t.memberIds).filter(keep)
			}
		}
		const out = normalizeDb(db)
		write(file, out)
		console.log(`${kind}: removed ${before - arr(out.files[key]).length}`)
		report(file, out)
	},

	stats(args) {
		const [file] = args
		if (!file) die('Usage: stats <file.bbdb>')
		const db = read(file)
		const wrestlers = arr(db.files?.['wrestlers.json'])
		const promotions = arr(db.files?.['promotions.json'])
		console.log(`${db.name} — ${promotions.length} promotions, ${wrestlers.length} people`)
		const line = (label, list) => {
			const byType = {}
			for (const w of list) byType[w.type] = (byType[w.type] ?? 0) + 1
			console.log(`  ${label.padEnd(28)} ${list.length} (${Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(', ')})`)
		}
		const contracts = wrestlers.flatMap(w => [w.contract, ...arr(w.additionalContracts)]).filter(c => isObj(c) && c.status === 'active')
		for (const p of promotions) {
			line(`${p.shortName} #${p.id} (level ${p.level})`, wrestlers.filter(w => w.promotionId === p.id))
			console.log(`  ${''.padEnd(28)} shows ${arr(p.shows).length}, ppvs ${arr(p.ppvs).length}, titles ${arr(p.titles).length}, teams ${arr(p.teams).length}`)
			const mine = contracts.filter(c => c.promotionId === p.id)
			const terms = {}
			for (const c of mine) {
				const k = `${c.type} ${c.wageType ?? `${legacyWageType(c.type)}*`}`
				terms[k] = (terms[k] ?? 0) + 1
			}
			console.log(`  ${''.padEnd(28)} payroll ${money(mine.reduce((s, c) => s + monthlyCost(c), 0))}/month — ${Object.entries(terms).map(([k, n]) => `${k} ${n}`).join(', ') || 'no contracts'}`)
		}
		line('free agents', wrestlers.filter(w => w.promotionId === undefined))
		if (contracts.some(c => !c.wageType)) console.log('\n  * no wageType: the game assumes it from exclusivity')
	},

	template(args) {
		const [kind] = args
		if (!TEMPLATES[kind]) die(`Usage: template <${Object.keys(TEMPLATES).join('|')}>`)
		console.log(JSON.stringify(TEMPLATES[kind](), null, 2))
	},

	// Port of booker-blitz scripts/migrate-contract-terms-by-size.ts: re-terms
	// every contract with the rule AI promotions sign by. Legacy contracts (no
	// wageType) are read as monthly figures; --from-yearly divides them (and
	// legacy free-agent asks) by 12 first, for databases built with yearly wages.
	reterm(args) {
		const [file] = args
		if (!file) die('Usage: reterm <file.bbdb> [--from-yearly] [--write]')
		const fromYearly = args.includes('--from-yearly')
		const db = read(file)
		const promotions = arr(db.files?.['promotions.json']).filter(isObj)
		const wrestlers = arr(db.files?.['wrestlers.json']).filter(isObj)
		embedStandaloneContracts(wrestlers, arr(db.files?.['contracts.json']))
		const levelById = new Map(promotions.map(p => [p.id, p.level]))
		const popularityById = rosterPopularity(promotions, wrestlers)
		const tally = {}
		let changed = 0
		let skipped = 0
		const reterm = (w, c, isExtra) => {
			const level = levelById.get(c.promotionId)
			if (!isNum(level) || !isNum(c.wage)) {
				skipped++
				return c
			}
			const isTop = (w.popularity ?? 30) > TOP_TALENT_POPULARITY_RATIO * (popularityById.get(c.promotionId) ?? level * 10)
			const terms = contractTerms(level, isTop)
			// Extra deals stay non-exclusive: exclusive talent works one company
			if (isExtra) terms.type = 'non-exclusive'
			let monthly = c.wageType ? toMonthly(c.wage, c.wageType) : c.wage
			if (fromYearly && !c.wageType) monthly = Math.round(monthly / 12)
			const next = {...c, type: terms.type, wageType: terms.wageType, wage: fromMonthly(monthly, terms.wageType)}
			const tier = level >= AI_EXCLUSIVE_MIN_LEVEL ? 'big (6+)' : level >= AI_MONTHLY_MIN_LEVEL ? 'mid (4-5)' : 'small (1-3)'
			const key = `${tier}: ${terms.type} + ${terms.wageType}`
			tally[key] = (tally[key] ?? 0) + 1
			if (c.type !== next.type || (c.wageType ?? legacyWageType(c.type)) !== next.wageType || c.wage !== next.wage) changed++
			return next
		}
		for (const w of wrestlers) {
			if (isObj(w.contract)) {
				w.contract = reterm(w, w.contract, false)
				w.wage = w.contract.wage
				w.wageType = w.contract.wageType
			} else if (fromYearly && isNum(w.wage) && !w.wageType) w.wage = Math.round(w.wage / 12)
			if (Array.isArray(w.additionalContracts)) w.additionalContracts = w.additionalContracts.map(c => (isObj(c) ? reterm(w, c, true) : c))
		}
		db.files['wrestlers.json'] = wrestlers
		const out = normalizeDb(db)
		console.log('Contracts by promotion size and new terms:')
		for (const [k, n] of Object.entries(tally).sort()) console.log(`  ${k}: ${n}`)
		console.log(`Changed: ${changed}. Skipped (unknown promotion or no wage): ${skipped}.`)
		finish(file, out, args)
	},

	// Port of booker-blitz scripts/rebalance-salaries.ts: sets every contract's
	// wage from promotion level × card × role share × merit, in the contract's
	// own wage unit. Free agents and retired workers are left alone.
	'rebalance-wages'(args) {
		const [file] = args
		if (!file) die('Usage: rebalance-wages <file.bbdb> [--write]')
		const db = normalizeDb(read(file))
		const promotions = db.files['promotions.json']
		const promoById = new Map(promotions.map(p => [p.id, p]))
		const before = new Map()
		const after = new Map()
		const heads = new Map()
		const add = (m, id, v) => m.set(id, (m.get(id) ?? 0) + v)
		for (const w of db.files['wrestlers.json']) {
			if (w.retired) continue
			for (const c of [w.contract, ...arr(w.additionalContracts)]) {
				const p = isObj(c) && promoById.get(c.promotionId)
				if (!p) continue
				add(before, p.id, monthlyCost(c))
				c.wage = fromMonthly(suggestMonthlyWage(w, p.level), c.wageType)
				add(after, p.id, monthlyCost(c))
				add(heads, p.id, 1)
			}
			if (w.contract) w.wage = w.contract.wage
		}
		// Rough monthly gate: weekly TV at a 5,000-seat arena ~70% full, plus PPVs over the year
		const gate = p => {
			const seats = 5000 * 0.7
			const tv = arr(p.shows).filter(s => !s.isDormant).reduce((s, x) => s + (x.ticketPrice ?? 0) * seats, 0)
			const ppv = arr(p.ppvs).reduce((s, x) => s + (x.ticketPrice ?? 0) * seats, 0)
			return tv * 4.33 + ppv / 12
		}
		console.table(
			promotions.map(p => {
				const floors = wageFloors(p.level)
				const est = gate(p)
				return {
					promotion: p.shortName,
					level: p.level,
					'UC / LC floor': `${money(floors.upper)} / ${money(floors.lower)}`,
					contracts: heads.get(p.id) ?? 0,
					'payroll before': money(before.get(p.id) ?? 0),
					'payroll after': money(after.get(p.id) ?? 0),
					'est. gate/mo': money(est),
					'payroll/gate': est ? `${Math.round(((after.get(p.id) ?? 0) / est) * 100)}%` : '-',
					balance: money(p.balance)
				}
			})
		)
		finish(file, db, args)
	},

	// Port of booker-blitz scripts/potentialAbility.ts: gives wrestlers growth
	// room (potentialAbility above currentAbility). Rookies get up to +20,
	// 15-year veterans up to +4. Seeded by id, so re-runs give the same values.
	// Without --all it only touches wrestlers with no room to grow.
	'seed-potential'(args) {
		const [file] = args
		if (!file) die('Usage: seed-potential <file.bbdb> [--all] [--write]')
		const all = args.includes('--all')
		const db = read(file)
		const refYear = Number(str(db.files?.['save_meta.json']?.startDate, '2026').slice(0, 4)) || 2026
		let seeded = 0
		for (const w of arr(db.files?.['wrestlers.json'])) {
			if (!isObj(w) || (w.type ?? 'wrestler') !== 'wrestler' || w.retired || w.dead) continue
			const ca = stat(w.currentAbility, stat(w.ability, 50))
			if (!all && isNum(w.potentialAbility) && w.potentialAbility > ca) continue
			const debutYear = new Date(w.debut).getUTCFullYear()
			const years = Math.min(15, Math.max(0, refYear - (Number.isNaN(debutYear) ? refYear - 5 : debutYear)))
			const headroom = Math.round(Math.max(2, 20 - years * ((20 - 4) / 15)))
			w.currentAbility = ca
			w.potentialAbility = Math.min(100, ca + Math.floor(seededRandom(Number(w.id) || 0) * (headroom + 1)))
			seeded++
		}
		console.log(`Seeded potentialAbility for ${seeded} wrestler(s)${all ? '' : ' with no growth room'}.`)
		finish(file, normalizeDb(db), args)
	}
}

const money = n => `$${Math.round(n).toLocaleString('en-US')}`
// Monthly cost of a contract; per-appearance deals at their booking estimate
const monthlyCost = c => (isNum(c?.wage) ? ((c.wageType ?? legacyWageType(c.type)) === 'per-appearance' ? c.wage * (isNum(c.bookingsPerMonth) ? c.bookingsPerMonth : APPEARANCES_PER_MONTH) : c.wage) : 0)
// mulberry32, one draw per seed
const seededRandom = seed => {
	let t = (seed + 0x6d2b79f5) | 0
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
// Bulk commands are dry runs unless --write
const finish = (file, db, args) => {
	if (!args.includes('--write')) return console.log('Dry run. Re-run with --write to save.')
	write(file, db)
	console.log(`Wrote ${file}`)
	report(file, db)
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('bbdb.mjs')
if (isMain) {
	const [cmd, ...args] = process.argv.slice(2)
	if (!commands[cmd]) {
		const lines = readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1)
		console.log(lines.slice(0, lines.findIndex(l => !l.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n'))
		process.exit(cmd ? 1 : 0)
	}
	commands[cmd](args)
}
