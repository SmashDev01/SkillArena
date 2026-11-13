use near_sdk::{BorshStorageKey, 
    borsh::{self, BorshDeserialize, BorshSerialize},
    collections::LookupMap,
    env, near_bindgen, AccountId, NearToken, PanicOnDefault, Promise,
};
use near_sdk::serde::{Deserialize, Serialize};

const MAX_PLAYERS: usize = 100;

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Tournaments,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Tournament {
    pub tournament_id: u64,
    pub players: Vec<AccountId>,
    pub prize_pool: u128,
    pub winner: Option<AccountId>,
    pub finalized: bool,
    pub claimed: bool,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct SkillArena {
    owner_id: AccountId,
    tournaments: LookupMap<u64, Tournament>,
}

#[near_bindgen]
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

        assert!(!tournament.finalized, "Tournament is already finalized");
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
        assert!(tournament.prize_pool > 0, "No prize has been funded");

        tournament.winner = Some(winner_id);
        tournament.finalized = true;

        self.tournaments.insert(&tournament_id, &tournament);
    }

    pub fn claim_prize(&mut self, tournament_id: u64) -> Promise {
        let mut tournament = self
            .tournaments
            .get(&tournament_id)
            .expect("Tournament not found");

        assert!(tournament.finalized, "Tournament is not finalized");
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
            .map(|t| t.players)
            .unwrap_or_default()
    }

    pub fn get_owner_id(&self) -> AccountId {
        self.owner_id.clone()
    }
}
