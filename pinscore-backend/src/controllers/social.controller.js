// social.controller.js — stub for connected platform accounts

async function getConnectedAccounts(req, res) {
  const creator_id = req.user.creator_id;
  // TODO: fetch connected platform accounts for creator
  return res.status(200).json({ success: true, accounts: [] });
}

async function connectAccount(req, res) {
  // TODO: OAuth flow to connect instagram/twitter/youtube/tiktok
  return res.status(501).json({ success: false, error: 'Not implemented in v1' });
}

module.exports = { getConnectedAccounts, connectAccount };
