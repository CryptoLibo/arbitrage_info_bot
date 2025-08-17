def lamports_to_sol(lamports):
    """
    Convierte lamports a SOL.
    1 SOL = 10^9 lamports.
    """
    return lamports / (10**9)

def sol_to_lamports(sol):
    """
    Convierte SOL a lamports.
    """
    return int(sol * (10**9))

def to_human_readable(amount, decimals):
    """
    Convierte una cantidad de token de su unidad más pequeña a un formato legible.
    """
    if not isinstance(amount, (int, float)) or not isinstance(decimals, int):
        raise ValueError("Amount must be numeric and decimals must be an integer.")
    return amount / (10**decimals)

def to_raw_amount(human_readable_amount, decimals):
    """
    Convierte una cantidad de token legible a su unidad más pequeña (raw amount).
    """
    if not isinstance(human_readable_amount, (int, float)) or not isinstance(decimals, int):
        raise ValueError("Human readable amount must be numeric and decimals must be an integer.")
    return int(human_readable_amount * (10**decimals))


