use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    collections::LookupMap,
    env, near, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise,
};
use near_sdk::serde::{Deserialize, Serialize};

const MAX_PLAYERS: usize = 100;
const LEADERBOARD_LIMIT: usize = 50;

const LEADERBOARD_PREFIX: &[u8] = b"skillarena:leaderboard:v1:";

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Tournaments,
}

#[derive(
    BorshDeserialize,
    BorshSerialize,
    Serialize,
    Deserialize,
    Clone,
    schemars::JsonSchema,
)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Tournament {
    pub tournament_id: u64,
    #[schemars(with = "Vec<String>")]
    pub players: Vec<AccountId>,
    pub prize_pool: u128,
    #[schemars(with = "Option<String>")]
    pub winner: Option<AccountId>,
    pub finalized: bool,
    pub claimed: bool,
}

#[derive(Serialize, Deserialize, Clone, schemars::JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct LeaderboardEntry {
    pub account_id: String,
    pub score: u64,
}

fn validate_game_id(game_id: &str) {
    assert!(
        matches!(
            game_id,
            "clutch-shot"
                | "reflex-rush"
                | "memory-matrix"
                | "precision-strike"
        ),
        "Unsupported game leaderboard"
    );
}

fn leaderboard_storage_key(game_id: &str) -> Vec<u8> {
    let mut key = LEADERBOARD_PREFIX.to_vec();
    key.extend_from_slice(game_id.as_bytes());
    key
}

fn read_leaderboard(game_id: &str) -> Vec<LeaderboardEntry> {
    let key = leaderboard_storage_key(game_id);

    match env::storage_read(&key) {
        Some(bytes) => near_sdk::serde_json::from_slice(&bytes)
            .expect("Invalid leaderboard storage"),
        None => Vec::new(),
    }
}

fn save_leaderboard(game_id: &str, entries: &[LeaderboardEntry]) {
    let key = leaderboard_storage_key(game_id);
    let bytes = near_sdk::serde_json::to_vec(entries)
        .expect("Could not serialize leaderboard");

    env::storage_write(&key, &bytes);
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct SkillArena {
    owner_id: AccountId,
    tournaments: LookupMap<u64, Tournament>,
}

#[near]
impl SkillArena {
    #[init]
    pub fn new() -> Self {
        Self {
            owner_id: env::predecessor_account_id(),
            tournaments: LookupMap::new(StorageKey::Tournaments),
        }
    }

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only the tournament owner can perform this action"
        );
    }

    pub fn create_tournament(&mut self, tournament_id: u64) {
        self.assert_owner();

        assert!(
            self.tournaments.get(&tournament_id).is_none(),
            "Tournament already exists"
        );

        self.tournaments.insert(
            &tournament_id,
            &Tournament {
                tournament_id,
                players: Vec::new(),
                prize_pool: 0,
                winner: None,
                finalized: false,
                claimed: false,
            },
        );
    }

    pub fn register_player(&mut self, tournament_id: u64) {
        let account_id = env::predecessor_account_id();

        let mut tournament = self
            .tournaments
            .get(&tournament_id)
            .expect("Tournament not found");

        assert!(
            !tournament.finalized,
            "Tournament is already finalized"
        );

        assert!(
            tournament.players.len() < MAX_PLAYERS,
            "Tournament is full"
        );

        assert!(
            !tournament.players.contains(&account_id),
            "Already registered"
        );

        tournament.players.push(account_id);
        self.tournaments.insert(&tournament_id, &tournament);
    }

    #[payable]
    pub fn fund_tournament(&mut self, tournament_id: u64) {
        self.assert_owner();

        let deposit = env::attached_deposit().as_yoctonear();

        assert!(deposit > 0, "Attach a positive NEAR deposit");

        let mut tournament = self
            .tournaments
            .get(&tournament_id)
            .expect("Tournament not found");

        assert!(!tournament.finalized, "Tournament is finalized");

        tournament.prize_pool = tournament
            .prize_pool
            .checked_add(deposit)
            .expect("Prize pool overflow");

        self.tournaments.insert(&tournament_id, &tournament);
    }

    pub fn finalize_tournament(
        &mut self,
        tournament_id: u64,
        winner_id: AccountId,
    ) {
        self.assert_owner();

        let mut tournament = self
            .tournaments
            .get(&tournament_id)
            .expect("Tournament not found");

        assert!(!tournament.finalized, "Already finalized");

        assert!(
            tournament.players.contains(&winner_id),
            "Winner must be registered"
        );

        assert!(
            tournament.prize_pool > 0,
            "No prize has been funded"
        );

        tournament.winner = Some(winner_id);
        tournament.finalized = true;

        self.tournaments.insert(&tournament_id, &tournament);
    }

    pub fn claim_prize(&mut self, tournament_id: u64) -> Promise {
        let mut tournament = self
            .tournaments
            .get(&tournament_id)
            .expect("Tournament not found");

        assert!(
            tournament.finalized,
            "Tournament is not finalized"
        );

        assert!(!tournament.claimed, "Prize already claimed");

        let winner = tournament.winner.clone().expect("Winner not set");

        assert_eq!(
            env::predecessor_account_id(),
            winner,
            "Only the winner can claim"
        );

        let amount = tournament.prize_pool;

        assert!(amount > 0, "No prize available");

        tournament.claimed = true;
        tournament.prize_pool = 0;

        self.tournaments.insert(&tournament_id, &tournament);

        Promise::new(winner).transfer(NearToken::from_yoctonear(amount))
    }

    pub fn get_tournament(
        &self,
        tournament_id: u64,
    ) -> Option<Tournament> {
        self.tournaments.get(&tournament_id)
    }

    pub fn get_registered_players(
        &self,
        tournament_id: u64,
    ) -> Vec<AccountId> {
        self.tournaments
            .get(&tournament_id)
            .map(|tournament| tournament.players)
            .unwrap_or_default()
    }

    pub fn get_owner_id(&self) -> AccountId {
        self.owner_id.clone()
    }

    // Save each player's personal best independently of the Top 50.
    pub fn submit_score(&mut self, game_id: String, score: u64) {
        validate_game_id(&game_id);

        let account_id = env::predecessor_account_id().to_string();

        let mut personal_key = LEADERBOARD_PREFIX.to_vec();
        personal_key.extend_from_slice(game_id.as_bytes());
        personal_key.extend_from_slice(b":player:");
        personal_key.extend_from_slice(account_id.as_bytes());

        let previous_score: Option<u64> = env::storage_read(&personal_key)
            .map(|bytes| near_sdk::serde_json::from_slice(&bytes)
                .expect("Invalid personal best storage"));

        let is_better = match previous_score {
            None => true,
            Some(previous) if game_id == "reflex-rush" => score < previous,
            Some(previous) => score > previous,
        };

        if !is_better {
            return;
        }

        let score_bytes = near_sdk::serde_json::to_vec(&score)
            .expect("Could not serialize personal best");
        env::storage_write(&personal_key, &score_bytes);

        let mut entries = read_leaderboard(&game_id);

        if let Some(entry) = entries
            .iter_mut()
            .find(|entry| entry.account_id == account_id)
        {
            entry.score = score;
        } else {
            entries.push(LeaderboardEntry {
                account_id,
                score,
            });
        }

        if game_id == "reflex-rush" {
            entries.sort_by_key(|entry| entry.score);
        } else {
            entries.sort_by(|a, b| b.score.cmp(&a.score));
        }

        entries.truncate(LEADERBOARD_LIMIT);
        save_leaderboard(&game_id, &entries);
    }

    // Retrieve the Top 50 for one specific game.
    pub fn get_leaderboard(
        &self,
        game_id: String,
    ) -> Vec<LeaderboardEntry> {
        validate_game_id(&game_id);
        read_leaderboard(&game_id)
    }
}
